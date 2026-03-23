import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

const faqItemSchema = z.object({
  question: z.string().min(1),
});
const faqAnswerSchema = z.object({
  answer: z.string().min(1),
});

export type FaqItemEntry = Tables<'faq_items'>;
export type FaqItemInsert = TablesInsert<'faq_items'>;
export type FaqItemUpdate = TablesUpdate<'faq_items'>;
export type FaqAnswerEntry = Tables<'faq_answers'>;
export type FaqAnswerInsert = TablesInsert<'faq_answers'>;
export type FaqAnswerUpdate = TablesUpdate<'faq_answers'>;

export const faqKeys = {
  all: ['faq'] as const,
  byRuleset: (rulesetId: number) => [...faqKeys.all, 'ruleset', rulesetId] as const,
  detail: (id: number) => [...faqKeys.all, 'detail', id] as const,
  askedBy: (profileId: string) => [...faqKeys.all, 'askedBy', profileId] as const,
  answeredBy: (profileId: string) => [...faqKeys.all, 'answeredBy', profileId] as const,
};

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
    queryFn: async () =>
      await db.query<FaqItemWithDetails[]>('faq:byRuleset', {
        ruleset_id: rulesetId,
      }),
  });
}

export function faqItemDetailQueryOptions(id: number) {
  return queryOptions({
    queryKey: faqKeys.detail(id),
    queryFn: async () =>
      await db.query<FaqItemEntry & { faq_answers: FaqAnswerEntry[] }>('faq:detail', { id }),
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
    queryFn: async () =>
      await db.query<FaqItemAskedByWithRuleset[]>('faq:askedBy', { profile_id: profileId }),
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
    queryFn: async () =>
      await db.query<FaqAnswerWithParent[]>('faq:answeredBy', { profile_id: profileId }),
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
      const validated = faqItemSchema.parse({ question });
      return await db.mutation<FaqItemEntry>('faq:createItem', {
        ruleset_id: rulesetId,
        question: validated.question,
        answer,
      });
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
    mutationFn: async ({ id, input }: { id: number; input: Partial<FaqItemUpdate> }) =>
      await db.mutation<FaqItemEntry>('faq:updateItem', {
        id,
        question: input.question,
        accepted_answer_id: input.accepted_answer_id ?? undefined,
      }),
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
    }) =>
      await db.mutation<FaqItemEntry>('faq:setAcceptedAnswer', {
        faq_item_id: faqItemId,
        accepted_answer_id: acceptedAnswerId,
      }),
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
    mutationFn: async (id: number) =>
      await db.mutation<{ id: number; rulesetId?: number; askedBy?: string }>('faq:deleteItem', {
        id,
      }),
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
      const validated = faqAnswerSchema.parse({ answer });
      return await db.mutation<FaqAnswerEntry>('faq:createAnswer', {
        faq_item_id: faqItemId,
        answer: validated.answer,
      });
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
      return await db.mutation<FaqAnswerEntry>('faq:updateAnswer', {
        id,
        answer: validated.answer,
      });
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
    mutationFn: async (id: number) =>
      await db.mutation<{ id: number; faqItemId?: number; answeredBy?: string }>(
        'faq:deleteAnswer',
        {
          id,
        }
      ),
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
