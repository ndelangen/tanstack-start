import { db } from '@db/core';
import { toLiveQueryResult, useLiveMutation } from '@app/db/core/live';
import { faqAnswerSchema, faqQuestionSchema } from '@app/faq/validation';
import { useQuery } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type FaqItemRow = Doc<'faq_items'>;
export type FaqAnswerRow = Doc<'faq_answers'>;
export type FaqItemEntry = FaqItemRow & { id: string };
export type FaqItemInsert = FaqItemEntry;
export type FaqItemUpdate = Partial<FaqItemEntry>;
export type FaqAnswerEntry = FaqAnswerRow & { id: string };
export type FaqAnswerInsert = FaqAnswerEntry;
export type FaqAnswerUpdate = Partial<FaqAnswerEntry>;

export type FaqItemWithDetails = FaqItemEntry & {
  faq_answers: FaqAnswerEntry[];
  asker_profile: {
    id: string;
    slug: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export async function loadFaqItemsByRuleset(rulesetId: string): Promise<FaqItemWithDetails[]> {
  const items = await db.query<
    (Omit<FaqItemWithDetails, 'id' | 'faq_answers'> & {
      faq_answers: Omit<FaqAnswerEntry, 'id'>[];
    })[]
  >(api.faq.byRuleset, {
    ruleset_id: rulesetId,
  });
  return items.map((item) => ({
    ...item,
    id: item._id,
    faq_answers: item.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
  }));
}

export async function loadFaqItemDetail(id: string): Promise<
  Omit<FaqItemEntry, 'id'> & { faq_answers: Omit<FaqAnswerEntry, 'id'>[] } & { id: string }
> {
  const item = await db.query<Omit<FaqItemEntry, 'id'> & { faq_answers: Omit<FaqAnswerEntry, 'id'>[] }>(
    api.faq.detail,
    { id }
  );
  return {
    ...item,
    id: item._id,
    faq_answers: item.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
  };
}

export async function loadFaqItemByRulesetAndSlug(
  rulesetSlug: string,
  questionSlug: string
): Promise<
  Omit<FaqItemEntry, 'id' | 'faq_answers'> & {
    id: string;
    asker_profile: {
      id: string;
      slug: string;
      username: string | null;
      avatar_url: string | null;
    } | null;
    ruleset: { id: string; slug: string; name: string };
    faq_answers: (Omit<FaqAnswerEntry, 'id'> & {
      id: string;
      answerer_profile: {
        id: string;
        slug: string;
        username: string | null;
        avatar_url: string | null;
      } | null;
    })[];
  }
> {
  const item = await db.query<
    Omit<FaqItemEntry, 'id' | 'faq_answers'> & {
      asker_profile: {
        id: string;
        slug: string;
        username: string | null;
        avatar_url: string | null;
      } | null;
      ruleset: { id: string; slug: string; name: string };
      faq_answers: (Omit<FaqAnswerEntry, 'id'> & {
        answerer_profile: {
          id: string;
          slug: string;
          username: string | null;
          avatar_url: string | null;
        } | null;
      })[];
    }
  >(api.faq.detailByRulesetSlugAndQuestionSlug, {
    ruleset_slug: rulesetSlug,
    question_slug: questionSlug,
  });
  return {
    ...item,
    id: item._id,
    ruleset: { ...item.ruleset, id: item.ruleset.id },
    faq_answers: item.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
  };
}

export function useFaqItemsByRuleset(rulesetId: string, options?: { initialData?: FaqItemWithDetails[] }) {
  const enabled = Boolean(rulesetId);
  const args = enabled ? ({ ruleset_id: rulesetId } as never) : 'skip';
  const liveData = useQuery(api.faq.byRuleset, args) as
    | (Omit<FaqItemWithDetails, 'id' | 'faq_answers'> & {
        faq_answers: Omit<FaqAnswerEntry, 'id'>[];
      })[]
    | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((item) => ({
      ...item,
      id: item._id,
      faq_answers: item.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
    })),
  };
}

export function useFaqItem(id: string) {
  const enabled = Boolean(id);
  const args = enabled ? ({ id } as never) : 'skip';
  const liveData = useQuery(api.faq.detail, args) as
    | (Omit<FaqItemEntry, 'id'> & { faq_answers: Omit<FaqAnswerEntry, 'id'>[] })
    | undefined;
  const result = toLiveQueryResult(liveData, enabled);
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id: result.data._id,
          faq_answers: result.data.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
        }
      : undefined,
  };
}

export function useFaqItemByRulesetAndSlug(
  rulesetSlug: string,
  questionSlug: string,
  options?: {
    initialData?: Omit<FaqItemEntry, 'id' | 'faq_answers'> & {
      id: string;
      asker_profile: {
        id: string;
        slug: string;
        username: string | null;
        avatar_url: string | null;
      } | null;
      ruleset: { id: string; slug: string; name: string };
      faq_answers: (Omit<FaqAnswerEntry, 'id'> & {
        id: string;
        answerer_profile: {
          id: string;
          slug: string;
          username: string | null;
          avatar_url: string | null;
        } | null;
      })[];
    };
  }
) {
  const enabled = Boolean(rulesetSlug) && Boolean(questionSlug);
  const args = enabled
    ? ({ ruleset_slug: rulesetSlug, question_slug: questionSlug } as never)
    : 'skip';
  const liveData = useQuery(api.faq.detailByRulesetSlugAndQuestionSlug, args) as
    | (Omit<FaqItemEntry, 'id' | 'faq_answers'> & {
        asker_profile: {
          id: string;
          slug: string;
          username: string | null;
          avatar_url: string | null;
        } | null;
        ruleset: { id: string; slug: string; name: string };
        faq_answers: (Omit<FaqAnswerEntry, 'id'> & {
          answerer_profile: {
            id: string;
            slug: string;
            username: string | null;
            avatar_url: string | null;
          } | null;
        })[];
      })
    | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id: result.data._id,
          ruleset: { ...result.data.ruleset, id: result.data.ruleset.id },
          faq_answers: result.data.faq_answers.map((answer) => ({ ...answer, id: answer._id })),
        }
      : undefined,
  };
}

export type FaqItemAskedByWithRuleset = FaqItemEntry & {
  ruleset: { id: string; name: string; slug: string };
};

export async function loadFaqItemsAskedBy(profileId: string): Promise<FaqItemAskedByWithRuleset[]> {
  const entries = await db.query<
    (Omit<FaqItemAskedByWithRuleset, 'id'> & {
      ruleset: { id: string; name: string; slug: string };
    })[]
  >(api.faq.askedBy, { profile_id: profileId });
  return entries.map((entry) => ({ ...entry, id: entry._id }));
}

export type FaqAnswerWithParent = FaqAnswerEntry & {
  faq_item: {
    id: string;
    slug: string;
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
  ruleset: { id: string; name: string; slug: string };
};

export async function loadFaqAnswersByUser(profileId: string): Promise<FaqAnswerWithParent[]> {
  const answers = await db.query<
    (Omit<FaqAnswerWithParent, 'id' | 'faq_item'> & {
      faq_item: Omit<FaqAnswerWithParent['faq_item'], 'id'> & { id: string };
    })[]
  >(api.faq.answeredBy, { profile_id: profileId });
  return answers.map((answer) => ({
    ...answer,
    id: answer._id,
    faq_item: { ...answer.faq_item, id: answer.faq_item.id },
  }));
}

export function useFaqItemsAskedBy(
  profileId: string | undefined,
  options?: { initialData?: FaqItemAskedByWithRuleset[] }
) {
  const enabled = profileId != null && profileId !== '';
  const args = enabled ? ({ profile_id: profileId ?? '' } as never) : 'skip';
  const liveData = useQuery(api.faq.askedBy, args) as
    | (Omit<FaqItemAskedByWithRuleset, 'id'> & {
        ruleset: { id: string; name: string; slug: string };
      })[]
    | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useFaqAnswersByUser(
  profileId: string | undefined,
  options?: { initialData?: FaqAnswerWithParent[] }
) {
  const enabled = profileId != null && profileId !== '';
  const args = enabled ? ({ profile_id: profileId ?? '' } as never) : 'skip';
  const liveData = useQuery(api.faq.answeredBy, args) as
    | (Omit<FaqAnswerWithParent, 'id' | 'faq_item'> & {
        faq_item: Omit<FaqAnswerWithParent['faq_item'], 'id'> & { id: string };
      })[]
    | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((answer) => ({
      ...answer,
      id: answer._id,
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
            variables.answer === undefined || variables.answer.trim().length === 0
              ? undefined
              : faqAnswerSchema.parse(variables.answer),
        },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
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
    }) => {
      const entry = await mutation.mutateAsync({
        ruleset_id: rulesetId,
        question: faqQuestionSchema.parse(question),
        answer:
          answer === undefined || answer.trim().length === 0
            ? undefined
            : faqAnswerSchema.parse(answer),
      });
      return { ...entry, id: entry._id };
    },
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
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id, input }: { id: string; input: Partial<FaqItemUpdate> }) => {
      const entry = await mutation.mutateAsync({
        id,
        question:
          input.question !== undefined ? faqQuestionSchema.parse(input.question) : undefined,
        accepted_answer_id: input.accepted_answer_id,
      });
      return { ...entry, id: entry._id };
    },
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
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      faqItemId,
      acceptedAnswerId,
    }: {
      faqItemId: string;
      acceptedAnswerId: string | null;
    }) => {
      const entry = await mutation.mutateAsync({
        faq_item_id: faqItemId,
        accepted_answer_id: acceptedAnswerId,
      });
      return { ...entry, id: entry._id };
    },
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
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ faqItemId, answer }: { faqItemId: string; answer: string }) => {
      const entry = await mutation.mutateAsync({
        faq_item_id: faqItemId,
        answer: faqAnswerSchema.parse(answer),
      });
      return { ...entry, id: entry._id };
    },
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
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id, answer }: { id: string; answer: string }) => {
      const entry = await mutation.mutateAsync({ id, answer: faqAnswerSchema.parse(answer) });
      return { ...entry, id: entry._id };
    },
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
