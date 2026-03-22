import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

/* Schemas (faq_items/faq_answers use normal columns, not data JSONB – kept here to avoid db:schemas) */
const faqItemSchema = z.object({
  question: z.string().min(1),
});
const faqAnswerSchema = z.object({
  answer: z.string().min(1),
});

/* Types */

export type FaqItemEntry = Tables<'faq_items'>;
export type FaqItemInsert = TablesInsert<'faq_items'>;
export type FaqItemUpdate = TablesUpdate<'faq_items'>;
export type FaqAnswerEntry = Tables<'faq_answers'>;
export type FaqAnswerInsert = TablesInsert<'faq_answers'>;
export type FaqAnswerUpdate = TablesUpdate<'faq_answers'>;

/* Query Keys */

export const faqKeys = {
  all: ['faq'] as const,
  byRuleset: (rulesetId: number) => [...faqKeys.all, 'ruleset', rulesetId] as const,
  detail: (id: number) => [...faqKeys.all, 'detail', id] as const,
  askedBy: (profileId: string) => [...faqKeys.all, 'askedBy', profileId] as const,
  answeredBy: (profileId: string) => [...faqKeys.all, 'answeredBy', profileId] as const,
};

/* Queries */

export type FaqItemWithDetails = FaqItemEntry & {
  faq_answers: FaqAnswerEntry[];
  asker_profile: {
    id: string;
    slug: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export function faqItemsByRulesetQueryOptions(rulesetId: number) {
  return queryOptions({
    queryKey: faqKeys.byRuleset(rulesetId),
    queryFn: async () => {
      const { data: items, error } = await db
        .from('faq_items')
        .select('*')
        .eq('ruleset_id', rulesetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = items ?? [];
      if (list.length === 0) return [];

      const itemIds = list.map((i) => i.id);
      const askerIds = [...new Set(list.map((i) => i.asked_by))];

      const [answersResult, profilesResult] = await Promise.all([
        db.from('faq_answers').select('*').in('faq_item_id', itemIds),
        db.from('profiles').select('id, slug, username, avatar_url').in('id', askerIds),
      ]);

      if (answersResult.error) throw answersResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const byItemId = new Map<number, FaqAnswerEntry[]>();
      for (const a of answersResult.data ?? []) {
        const arr = byItemId.get(a.faq_item_id) ?? [];
        arr.push(a);
        byItemId.set(a.faq_item_id, arr);
      }

      const profilesById = new Map(
        (profilesResult.data ?? []).map((p) => [
          p.id,
          { id: p.id, slug: p.slug, username: p.username, avatar_url: p.avatar_url },
        ])
      );

      return list.map((item) => ({
        ...item,
        faq_answers: byItemId.get(item.id) ?? [],
        asker_profile: profilesById.get(item.asked_by) ?? null,
      })) as FaqItemWithDetails[];
    },
  });
}

export function faqItemDetailQueryOptions(id: number) {
  return queryOptions({
    queryKey: faqKeys.detail(id),
    queryFn: async () => {
      const { data: item, error } = await db.from('faq_items').select('*').eq('id', id).single();

      if (error) throw error;
      if (!item) throw new Error(`FAQ item ${id} not found`);

      const { data: answers, error: answersError } = await db
        .from('faq_answers')
        .select('*')
        .eq('faq_item_id', id);

      if (answersError) throw answersError;

      return { ...item, faq_answers: answers ?? [] };
    },
  });
}

export function useFaqItemsByRuleset(rulesetId: number) {
  return useQuery(faqItemsByRulesetQueryOptions(rulesetId));
}

export function useFaqItem(id: number) {
  return useQuery(faqItemDetailQueryOptions(id));
}

export type FaqItemAskedByWithRuleset = FaqItemEntry & {
  ruleset: { id: number; name: string };
};

export function faqItemsAskedByQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: faqKeys.askedBy(profileId),
    queryFn: async () => {
      const { data, error } = await db
        .from('faq_items')
        .select('*')
        .eq('asked_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data ?? []) as FaqItemEntry[];
      if (list.length === 0) return [];

      const rulesetIds = [...new Set(list.map((i) => i.ruleset_id))];
      const { data: rulesets, error: rsError } = await db
        .from('rulesets')
        .select('id, name')
        .in('id', rulesetIds);

      if (rsError) throw rsError;
      const rulesetById = new Map((rulesets ?? []).map((r) => [r.id, r]));

      return list.map((item) => {
        const rs = rulesetById.get(item.ruleset_id);
        if (!rs) {
          throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item.id}`);
        }
        return { ...item, ruleset: rs };
      }) as FaqItemAskedByWithRuleset[];
    },
  });
}

export type FaqAnswerWithParent = FaqAnswerEntry & {
  faq_item: {
    id: number;
    question: string;
    ruleset_id: number;
    asked_by: string;
    accepted_answer_id: number | null;
  };
  asker_profile: {
    id: string;
    slug: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  ruleset: { id: number; name: string };
};

export function faqAnswersByUserQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: faqKeys.answeredBy(profileId),
    queryFn: async () => {
      const { data: answers, error } = await db
        .from('faq_answers')
        .select('*')
        .eq('answered_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = answers ?? [];
      if (list.length === 0) return [] as FaqAnswerWithParent[];

      const itemIds = [...new Set(list.map((a) => a.faq_item_id))];
      const { data: items, error: itemsError } = await db
        .from('faq_items')
        .select('id, question, ruleset_id, asked_by, accepted_answer_id')
        .in('id', itemIds);

      if (itemsError) throw itemsError;

      const byId = new Map((items ?? []).map((i) => [i.id, i]));
      const rulesetIds = [...new Set((items ?? []).map((i) => i.ruleset_id))];
      const askerIds = [...new Set((items ?? []).map((i) => i.asked_by))];

      const [rulesetsResult, profilesResult] = await Promise.all([
        db.from('rulesets').select('id, name').in('id', rulesetIds),
        db.from('profiles').select('id, slug, username, avatar_url').in('id', askerIds),
      ]);

      if (rulesetsResult.error) throw rulesetsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const rulesetById = new Map((rulesetsResult.data ?? []).map((r) => [r.id, r]));
      const profileById = new Map(
        (profilesResult.data ?? []).map((p) => [
          p.id,
          {
            id: p.id,
            slug: p.slug,
            username: p.username,
            avatar_url: p.avatar_url,
          },
        ])
      );

      return list.map((a) => {
        const item = byId.get(a.faq_item_id);
        if (!item) {
          throw new Error(`FAQ item ${a.faq_item_id} missing for answer ${a.id}`);
        }
        const ruleset = rulesetById.get(item.ruleset_id);
        if (!ruleset) {
          throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item.id}`);
        }
        return {
          ...a,
          faq_item: item,
          ruleset,
          asker_profile: profileById.get(item.asked_by) ?? null,
        };
      }) as FaqAnswerWithParent[];
    },
  });
}

export function useFaqItemsAskedBy(profileId: string | undefined) {
  return useQuery({
    ...faqItemsAskedByQueryOptions(profileId ?? ''),
    enabled: profileId != null && profileId !== '',
  });
}

export function useFaqAnswersByUser(profileId: string | undefined) {
  return useQuery({
    ...faqAnswersByUserQueryOptions(profileId ?? ''),
    enabled: profileId != null && profileId !== '',
  });
}

/* Mutations */

export function useCreateFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rulesetId,
      question,
      answer,
    }: {
      rulesetId: number;
      question: string;
      answer?: string;
    }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const validated = faqItemSchema.parse({ question });
      const { data: entry, error } = await db
        .from('faq_items')
        .insert({
          ruleset_id: rulesetId,
          question: validated.question,
          asked_by: user.data.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to create FAQ item');

      if (answer?.trim()) {
        const answerValidated = faqAnswerSchema.parse({ answer: answer.trim() });
        const { error: answerError } = await db.from('faq_answers').insert({
          faq_item_id: entry.id,
          answer: answerValidated.answer,
          answered_by: user.data.user.id,
        });
        if (answerError) throw answerError;
      }

      return entry;
    },
    onSuccess: (entry, variables) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry.id) });
      qc.invalidateQueries({ queryKey: faqKeys.all });
      qc.invalidateQueries({ queryKey: faqKeys.askedBy(entry.asked_by) });
      if (variables.answer?.trim()) {
        qc.invalidateQueries({ queryKey: faqKeys.answeredBy(entry.asked_by) });
      }
    },
  });
}

export function useUpdateFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<FaqItemUpdate> }) => {
      const { data: entry, error } = await db
        .from('faq_items')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`FAQ item ${id} not found`);
      return entry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry.id) });
      qc.invalidateQueries({ queryKey: faqKeys.askedBy(entry.asked_by) });
    },
  });
}

export function useSetAcceptedAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      faqItemId,
      acceptedAnswerId,
    }: {
      faqItemId: number;
      acceptedAnswerId: number | null;
    }) => {
      const { data: entry, error } = await db
        .from('faq_items')
        .update({ accepted_answer_id: acceptedAnswerId })
        .eq('id', faqItemId)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`FAQ item ${faqItemId} not found`);
      return entry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry.id) });
      qc.invalidateQueries({ queryKey: faqKeys.all });
    },
  });
}

export function useDeleteFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data: entry, error } = await db
        .from('faq_items')
        .delete()
        .eq('id', id)
        .select('ruleset_id, asked_by')
        .single();

      if (error) throw error;
      return { id, rulesetId: entry?.ruleset_id, askedBy: entry?.asked_by };
    },
    onSuccess: ({ rulesetId, askedBy }) => {
      if (rulesetId != null) {
        qc.invalidateQueries({ queryKey: faqKeys.byRuleset(rulesetId) });
      }
      if (askedBy != null) {
        qc.invalidateQueries({ queryKey: faqKeys.askedBy(askedBy) });
      }
    },
  });
}

export function useCreateFaqAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ faqItemId, answer }: { faqItemId: number; answer: string }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const validated = faqAnswerSchema.parse({ answer });
      const { data: entry, error } = await db
        .from('faq_answers')
        .insert({
          faq_item_id: faqItemId,
          answer: validated.answer,
          answered_by: user.data.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to create FAQ answer');
      return entry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry.faq_item_id) });
      qc.invalidateQueries({ queryKey: faqKeys.all });
      qc.invalidateQueries({ queryKey: faqKeys.answeredBy(entry.answered_by) });
    },
  });
}

export function useUpdateFaqAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) => {
      const validated = faqAnswerSchema.parse({ answer });
      const { data: entry, error } = await db
        .from('faq_answers')
        .update({ answer: validated.answer })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`FAQ answer ${id} not found`);
      return entry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry.faq_item_id) });
      qc.invalidateQueries({ queryKey: faqKeys.all });
      qc.invalidateQueries({ queryKey: faqKeys.answeredBy(entry.answered_by) });
    },
  });
}

export function useDeleteFaqAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data: entry, error } = await db
        .from('faq_answers')
        .delete()
        .eq('id', id)
        .select('faq_item_id, answered_by')
        .single();

      if (error) throw error;
      return { id, faqItemId: entry?.faq_item_id, answeredBy: entry?.answered_by };
    },
    onSuccess: ({ faqItemId, answeredBy }) => {
      if (faqItemId != null) {
        qc.invalidateQueries({ queryKey: faqKeys.detail(faqItemId) });
        qc.invalidateQueries({ queryKey: faqKeys.all });
      }
      if (answeredBy != null) {
        qc.invalidateQueries({ queryKey: faqKeys.answeredBy(answeredBy) });
      }
    },
  });
}
