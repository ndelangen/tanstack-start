import { queryOptions } from '@tanstack/react-query';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { faqAnswerSchema, faqQuestionSchema } from '@app/faq/validation';

import { api } from '../../../../convex/_generated/api';

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
        >(api.faq.byRuleset, {
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
      >(api.faq.detail, { id });
      return {
        ...withFaqItemId(item),
        faq_answers: item.faq_answers.map(withFaqAnswerId),
      };
    },
  });
}

export function useFaqItemsByRuleset(rulesetId: string) {
  const result = useLiveQuery<
    (Omit<FaqItemWithDetails, 'id' | 'faq_answers'> & {
      faq_answers: Omit<FaqAnswerEntry, 'id'>[];
    })[],
    { ruleset_id: string }
  >(api.faq.byRuleset, { ruleset_id: rulesetId }, { enabled: Boolean(rulesetId) });
  return {
    ...result,
    data: result.data?.map((item) => ({
      ...withFaqItemId(item),
      faq_answers: item.faq_answers.map(withFaqAnswerId),
    })),
  };
}

export function useFaqItem(id: string) {
  const result = useLiveQuery<
    Omit<FaqItemEntry, 'id'> & { faq_answers: Omit<FaqAnswerEntry, 'id'>[] },
    { id: string }
  >(api.faq.detail, { id }, { enabled: Boolean(id) });
  return {
    ...result,
    data: result.data
      ? {
          ...withFaqItemId(result.data),
          faq_answers: result.data.faq_answers.map(withFaqAnswerId),
        }
      : undefined,
  };
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
        >(api.faq.askedBy, { profile_id: profileId })
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
        >(api.faq.answeredBy, { profile_id: profileId })
      ).map((answer) => ({
        ...withFaqAnswerId(answer),
        faq_item: { ...answer.faq_item, id: answer.faq_item.id },
      })),
  });
}

export function useFaqItemsAskedBy(profileId: string | undefined) {
  const result = useLiveQuery<
    (Omit<FaqItemAskedByWithRuleset, 'id'> & { ruleset: { id: string; name: string } })[],
    { profile_id: string }
  >(
    api.faq.askedBy,
    { profile_id: profileId ?? '' },
    { enabled: profileId != null && profileId !== '' }
  );
  return {
    ...result,
    data: result.data?.map(withFaqItemId),
  };
}

export function useFaqAnswersByUser(profileId: string | undefined) {
  const result = useLiveQuery<
    (Omit<FaqAnswerWithParent, 'id' | 'faq_item'> & {
      faq_item: Omit<FaqAnswerWithParent['faq_item'], 'id'> & { id: string };
    })[],
    { profile_id: string }
  >(
    api.faq.answeredBy,
    { profile_id: profileId ?? '' },
    { enabled: profileId != null && profileId !== '' }
  );
  return {
    ...result,
    data: result.data?.map((answer) => ({
      ...withFaqAnswerId(answer),
      faq_item: { ...answer.faq_item, id: answer.faq_item.id },
    })),
  };
}

export function useCreateFaqItem() {
  const mutation = useLiveMutation<
    { ruleset_id: string; question: string; answer?: string },
    Omit<FaqItemEntry, 'id'>
  >(api.faq.createItem);
  return {
    ...mutation,
    mutate: (
      variables: { rulesetId: string; question: string; answer?: string },
      options?: { onSuccess?: (entry: FaqItemEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        {
          ruleset_id: variables.rulesetId,
          question: faqQuestionSchema.parse(variables.question),
          answer:
            variables.answer !== undefined && variables.answer.trim().length > 0
              ? faqAnswerSchema.parse(variables.answer)
              : undefined,
        },
        {
          onSuccess: (entry) => options?.onSuccess?.(withFaqItemId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      rulesetId,
      question,
      answer,
    }: {
      rulesetId: string;
      question: string;
      answer?: string;
    }) =>
      withFaqItemId(
        await mutation.mutateAsync({
          ruleset_id: rulesetId,
          question: faqQuestionSchema.parse(question),
          answer: answer !== undefined && answer.trim().length > 0 ? faqAnswerSchema.parse(answer) : undefined,
        })
      ),
  };
}

export function useUpdateFaqItem() {
  const mutation = useLiveMutation<
    { id: string; question?: string; accepted_answer_id?: string | null },
    Omit<FaqItemEntry, 'id'>
  >(api.faq.updateItem);
  return {
    ...mutation,
    mutate: (
      variables: { id: string; input: Partial<FaqItemUpdate> },
      options?: { onSuccess?: (entry: FaqItemEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        {
          id: variables.id,
          question:
            variables.input.question !== undefined
              ? faqQuestionSchema.parse(variables.input.question)
              : undefined,
          accepted_answer_id: variables.input.accepted_answer_id,
        },
        {
          onSuccess: (entry) => options?.onSuccess?.(withFaqItemId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id, input }: { id: string; input: Partial<FaqItemUpdate> }) =>
      withFaqItemId(
        await mutation.mutateAsync({
          id,
          question: input.question !== undefined ? faqQuestionSchema.parse(input.question) : undefined,
          accepted_answer_id: input.accepted_answer_id,
        })
      ),
  };
}

export function useSetAcceptedAnswer() {
  const mutation = useLiveMutation<
    { faq_item_id: string; accepted_answer_id: string | null },
    Omit<FaqItemEntry, 'id'>
  >(api.faq.setAcceptedAnswer);
  return {
    ...mutation,
    mutate: (
      variables: { faqItemId: string; acceptedAnswerId: string | null },
      options?: { onSuccess?: (entry: FaqItemEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { faq_item_id: variables.faqItemId, accepted_answer_id: variables.acceptedAnswerId },
        {
          onSuccess: (entry) => options?.onSuccess?.(withFaqItemId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      faqItemId,
      acceptedAnswerId,
    }: {
      faqItemId: string;
      acceptedAnswerId: string | null;
    }) =>
      withFaqItemId(
        await mutation.mutateAsync({
          faq_item_id: faqItemId,
          accepted_answer_id: acceptedAnswerId,
        })
      ),
  };
}

export function useDeleteFaqItem() {
  const mutation = useLiveMutation<
    { id: string },
    { id: string; rulesetId?: string; askedBy?: string }
  >(api.faq.deleteItem);
  return {
    ...mutation,
    mutate: (
      id: string,
      options?: {
        onSuccess?: (entry: { id: string; rulesetId?: string; askedBy?: string }) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        { id },
        {
          onSuccess: (entry) => options?.onSuccess?.(entry),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (id: string) => await mutation.mutateAsync({ id }),
  };
}

export function useCreateFaqAnswer() {
  const mutation = useLiveMutation<
    { faq_item_id: string; answer: string },
    Omit<FaqAnswerEntry, 'id'>
  >(api.faq.createAnswer);
  return {
    ...mutation,
    mutate: (
      variables: { faqItemId: string; answer: string },
      options?: { onSuccess?: (entry: FaqAnswerEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        {
          faq_item_id: variables.faqItemId,
          answer: faqAnswerSchema.parse(variables.answer),
        },
        {
          onSuccess: (entry) => options?.onSuccess?.(withFaqAnswerId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ faqItemId, answer }: { faqItemId: string; answer: string }) =>
      withFaqAnswerId(
        await mutation.mutateAsync({
          faq_item_id: faqItemId,
          answer: faqAnswerSchema.parse(answer),
        })
      ),
  };
}

export function useUpdateFaqAnswer() {
  const mutation = useLiveMutation<{ id: string; answer: string }, Omit<FaqAnswerEntry, 'id'>>(
    api.faq.updateAnswer
  );
  return {
    ...mutation,
    mutate: (
      variables: { id: string; answer: string },
      options?: { onSuccess?: (entry: FaqAnswerEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, answer: faqAnswerSchema.parse(variables.answer) },
        {
          onSuccess: (entry) => options?.onSuccess?.(withFaqAnswerId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id, answer }: { id: string; answer: string }) =>
      withFaqAnswerId(
        await mutation.mutateAsync({ id, answer: faqAnswerSchema.parse(answer) })
      ),
  };
}

export function useDeleteFaqAnswer() {
  const mutation = useLiveMutation<
    { id: string },
    { id: string; faqItemId?: string; answeredBy?: string }
  >(api.faq.deleteAnswer);
  return {
    ...mutation,
    mutate: (
      id: string,
      options?: {
        onSuccess?: (entry: { id: string; faqItemId?: string; answeredBy?: string }) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        { id },
        {
          onSuccess: (entry) => options?.onSuccess?.(entry),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (id: string) => await mutation.mutateAsync({ id }),
  };
}
