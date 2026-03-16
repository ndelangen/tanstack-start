import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { faqAnswerSchema, faqItemSchema } from '@data/faq';

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
};

/* Queries */

export function faqItemsByRulesetQueryOptions(rulesetId: number) {
  return queryOptions({
    queryKey: faqKeys.byRuleset(rulesetId),
    queryFn: async () => {
      const { data: items, error } = await db
        .from('faq_items')
        .select(
          `
          *,
          faq_answers (*)
        `
        )
        .eq('ruleset_id', rulesetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return items ?? [];
    },
  });
}

export function faqItemDetailQueryOptions(id: number) {
  return queryOptions({
    queryKey: faqKeys.detail(id),
    queryFn: async () => {
      const { data: item, error } = await db
        .from('faq_items')
        .select(
          `
          *,
          faq_answers (*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!item) throw new Error(`FAQ item ${id} not found`);
      return item;
    },
  });
}

export function useFaqItemsByRuleset(rulesetId: number) {
  return useQuery(faqItemsByRulesetQueryOptions(rulesetId));
}

export function useFaqItem(id: number) {
  return useQuery(faqItemDetailQueryOptions(id));
}

/* Mutations */

export function useCreateFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rulesetId,
      question,
    }: {
      rulesetId: number;
      question: string;
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
      return entry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
    },
  });
}

export function useUpdateFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: Partial<FaqItemUpdate>;
    }) => {
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
        .select('ruleset_id')
        .single();

      if (error) throw error;
      return { id, rulesetId: entry?.ruleset_id };
    },
    onSuccess: ({ rulesetId }) => {
      if (rulesetId != null) {
        qc.invalidateQueries({ queryKey: faqKeys.byRuleset(rulesetId) });
      }
    },
  });
}

export function useCreateFaqAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      faqItemId,
      answer,
    }: {
      faqItemId: number;
      answer: string;
    }) => {
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
    },
  });
}

export function useUpdateFaqAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      answer,
    }: {
      id: number;
      answer: string;
    }) => {
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
        .select('faq_item_id')
        .single();

      if (error) throw error;
      return { id, faqItemId: entry?.faq_item_id };
    },
    onSuccess: ({ faqItemId }) => {
      if (faqItemId != null) {
        qc.invalidateQueries({ queryKey: faqKeys.detail(faqItemId) });
      }
    },
  });
}
