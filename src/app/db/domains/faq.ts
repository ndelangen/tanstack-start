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

function withFaqItemId<T extends { _id: string }>(entry: T): T & { id: string } {
  return { ...entry, id: entry._id };
}

function withFaqAnswerId<T extends { _id: string }>(entry: T): T & { id: string } {
  return { ...entry, id: entry._id };
}

export const faqKeys = {
  all: ['faq'] as const,
  byRuleset: (rulesetId: string) => [...faqKeys.all, 'ruleset', rulesetId] as const,
  detail: (id: string) => [...faqKeys.all, 'detail', id] as const,
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

export function faqItemsByRulesetQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: faqKeys.byRuleset(rulesetId),
    queryFn: async () =>
      (
        await db.query<
          (Omit<FaqItemWithDetails, 'id' | 'faq_answers'> & {
            faq_answers: Omit<FaqAnswerEntry, 'id'>[];
          })[]
        >('faq:byRuleset', {
          ruleset_id: rulesetId,
        })
      ).map((item) => ({
        ...withFaqItemId(item),
        faq_answers: item.faq_answers.map(withFaqAnswerId),
      })),
  });
}

export function faqItemDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: faqKeys.detail(id),
    queryFn: async () => {
      const item = await db.query<
        Omit<FaqItemEntry, 'id'> & { faq_answers: Omit<FaqAnswerEntry, 'id'>[] }
      >('faq:detail', { id });
      return {
        ...withFaqItemId(item),
        faq_answers: item.faq_answers.map(withFaqAnswerId),
      };
    },
  });
}

export function useFaqItemsByRuleset(rulesetId: string) {
  return useQuery(faqItemsByRulesetQueryOptions(rulesetId));
}

export function useFaqItem(id: string) {
  return useQuery(faqItemDetailQueryOptions(id));
}

export type FaqItemAskedByWithRuleset = FaqItemEntry & {
  ruleset: { id: string; name: string };
};

export function faqItemsAskedByQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: faqKeys.askedBy(profileId),
    queryFn: async () =>
      (
        await db.query<
          (Omit<FaqItemAskedByWithRuleset, 'id'> & { ruleset: { id: string; name: string } })[]
        >('faq:askedBy', { profile_id: profileId })
      ).map(withFaqItemId),
  });
}

export type FaqAnswerWithParent = FaqAnswerEntry & {
  faq_item: {
    id: string;
    question: string;
    ruleset_id: string;
    asked_by: string;
    accepted_answer_id: string | null;
  };
  asker_profile: {
    id: string;
    slug: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  ruleset: { id: string; name: string };
};

export function faqAnswersByUserQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: faqKeys.answeredBy(profileId),
    queryFn: async () =>
      (
        await db.query<
          (Omit<FaqAnswerWithParent, 'id' | 'faq_item'> & {
            faq_item: Omit<FaqAnswerWithParent['faq_item'], 'id'> & { id: string };
          })[]
        >('faq:answeredBy', { profile_id: profileId })
      ).map((answer) => ({
        ...withFaqAnswerId(answer),
        faq_item: { ...answer.faq_item, id: answer.faq_item.id },
      })),
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
      rulesetId: string;
      question: string;
      answer?: string;
    }) => {
      const validated = faqItemSchema.parse({ question });
      return withFaqItemId(
        await db.mutation<Omit<FaqItemEntry, 'id'>>('faq:createItem', {
          ruleset_id: rulesetId,
          question: validated.question,
          answer,
        })
      );
    },
    onSuccess: (entry, variables) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry._id) });
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
    mutationFn: async ({ id, input }: { id: string; input: Partial<FaqItemUpdate> }) =>
      withFaqItemId(
        await db.mutation<Omit<FaqItemEntry, 'id'>>('faq:updateItem', {
          id,
          question: input.question,
          accepted_answer_id: input.accepted_answer_id ?? undefined,
        })
      ),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry._id) });
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
      faqItemId: string;
      acceptedAnswerId: string | null;
    }) =>
      withFaqItemId(
        await db.mutation<Omit<FaqItemEntry, 'id'>>('faq:setAcceptedAnswer', {
          faq_item_id: faqItemId,
          accepted_answer_id: acceptedAnswerId,
        })
      ),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: faqKeys.byRuleset(entry.ruleset_id) });
      qc.invalidateQueries({ queryKey: faqKeys.detail(entry._id) });
      qc.invalidateQueries({ queryKey: faqKeys.all });
    },
  });
}

export function useDeleteFaqItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      await db.mutation<{ id: string; rulesetId?: string; askedBy?: string }>('faq:deleteItem', {
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
    mutationFn: async ({ faqItemId, answer }: { faqItemId: string; answer: string }) => {
      const validated = faqAnswerSchema.parse({ answer });
      return withFaqAnswerId(
        await db.mutation<Omit<FaqAnswerEntry, 'id'>>('faq:createAnswer', {
          faq_item_id: faqItemId,
          answer: validated.answer,
        })
      );
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
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const validated = faqAnswerSchema.parse({ answer });
      return withFaqAnswerId(
        await db.mutation<Omit<FaqAnswerEntry, 'id'>>('faq:updateAnswer', {
          id,
          answer: validated.answer,
        })
      );
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
    mutationFn: async (id: string) =>
      await db.mutation<{ id: string; faqItemId?: string; answeredBy?: string }>(
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
