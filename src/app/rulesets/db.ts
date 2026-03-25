import { queryOptions } from '@tanstack/react-query';

import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { rulesetInputSchema } from '@app/rulesets/validation';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type Ruleset = { name: string };
export type RulesetRow = Doc<'rulesets'>;
export type RulesetEntry = Omit<RulesetRow, 'name'> & {
  name: Ruleset['name'];
  id: string;
};
export type RulesetInsert = Omit<RulesetEntry, 'name'> & {
  name: Ruleset['name'];
};
export type RulesetUpdate = Omit<Partial<RulesetEntry>, 'name'> & {
  name?: Ruleset['name'];
};

export const rulesetKeys = {
  all: ['rulesets'] as const,
  lists: () => [...rulesetKeys.all, 'list'] as const,
  list: (filters: object) => [...rulesetKeys.lists(), filters] as const,
  detail: (id: string) => [...rulesetKeys.all, 'detail', id] as const,
  detailBySlug: (slug: string) => [...rulesetKeys.all, 'detailBySlug', slug] as const,
  factions: (rulesetId: string) => [...rulesetKeys.detail(rulesetId), 'factions'] as const,
  byFaction: (factionId: string) => [...rulesetKeys.all, 'byFaction', factionId] as const,
  canAccess: (rulesetId: string) => [...rulesetKeys.all, 'canAccess', rulesetId] as const,
};

export function rulesetsListQueryOptions() {
  return queryOptions({
    queryKey: rulesetKeys.list({ type: 'all' }),
    queryFn: async () => {
      const entries = await db.query<RulesetRow[]>(api.rulesets.list, {});
      return entries.map((entry) => ({
        ...entry,
        id: entry._id,
        name: rulesetInputSchema.parse({ name: entry.name }).name,
      }));
    },
  });
}

export function rulesetDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: rulesetKeys.detail(id),
    queryFn: async () => {
      const entry = await db.query<RulesetRow>(api.rulesets.get, { id });
      return {
        ...entry,
        id: entry._id,
        name: rulesetInputSchema.parse({ name: entry.name }).name,
      };
    },
  });
}

export function rulesetBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: rulesetKeys.detailBySlug(slug),
    queryFn: async () => {
      const entry = await db.query<RulesetRow>(api.rulesets.getBySlug, { slug });
      return {
        ...entry,
        id: entry._id,
        name: rulesetInputSchema.parse({ name: entry.name }).name,
      };
    },
  });
}

export function rulesetFactionsQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: rulesetKeys.factions(rulesetId),
    queryFn: async () =>
      await db.query<string[]>(api.rulesets.factionIds, { ruleset_id: rulesetId }),
  });
}

export function rulesetFactionsWithDetailsQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: [...rulesetKeys.factions(rulesetId), 'details'] as const,
    queryFn: async () => {
      const entries = await db.query<{ factionId: string; name: string; urlSlug: string }[]>(
        api.rulesets.factionDetails,
        { ruleset_id: rulesetId }
      );
      return entries;
    },
  });
}

export function canAccessRulesetQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: rulesetKeys.canAccess(rulesetId),
    queryFn: async () => await db.query<boolean>(api.rulesets.canAccess, { ruleset_id: rulesetId }),
  });
}

export function useCanAccessRuleset(rulesetId: string) {
  return useLiveQuery<boolean, { ruleset_id: string }>(
    api.rulesets.canAccess,
    { ruleset_id: rulesetId },
    { enabled: Boolean(rulesetId) }
  );
}

export function rulesetsByFactionQueryOptions(factionId: string) {
  return queryOptions({
    queryKey: rulesetKeys.byFaction(factionId),
    queryFn: async () => {
      const entries = await db.query<RulesetRow[]>(api.rulesets.listByFaction, {
        faction_id: factionId,
      });
      return entries.map((entry) => ({
        ...entry,
        id: entry._id,
        name: rulesetInputSchema.parse({ name: entry.name }).name,
      }));
    },
  });
}

export function useRulesetsAll() {
  const result = useLiveQuery<RulesetRow[], Record<string, never>>(api.rulesets.list, {});
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...entry,
      id: entry._id,
      name: rulesetInputSchema.parse({ name: entry.name }).name,
    })),
  };
}

export function useRuleset(id: string) {
  const result = useLiveQuery<RulesetRow, { id: string }>(
    api.rulesets.get,
    { id },
    { enabled: Boolean(id) }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id: result.data._id,
          name: rulesetInputSchema.parse({ name: result.data.name }).name,
        }
      : undefined,
  };
}

export function useRulesetBySlug(slug: string) {
  const result = useLiveQuery<RulesetRow, { slug: string }>(
    api.rulesets.getBySlug,
    { slug },
    { enabled: Boolean(slug) }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id: result.data._id,
          name: rulesetInputSchema.parse({ name: result.data.name }).name,
        }
      : undefined,
  };
}

export function useRulesetFactions(rulesetId: string) {
  return useLiveQuery<string[], { ruleset_id: string }>(
    api.rulesets.factionIds,
    { ruleset_id: rulesetId },
    { enabled: Boolean(rulesetId) }
  );
}

export function useRulesetFactionsWithDetails(rulesetId: string) {
  const result = useLiveQuery<
    { factionId: string; name: string; urlSlug: string }[],
    { ruleset_id: string }
  >(api.rulesets.factionDetails, { ruleset_id: rulesetId }, { enabled: Boolean(rulesetId) });
  return {
    ...result,
    data: result.data,
  };
}

export function useRulesetsByFaction(factionRowId: string | undefined) {
  const result = useLiveQuery<RulesetRow[], { faction_id: string }>(
    api.rulesets.listByFaction,
    { faction_id: factionRowId ?? '' },
    { enabled: Boolean(factionRowId) }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...entry,
      id: entry._id,
      name: rulesetInputSchema.parse({ name: entry.name }).name,
    })),
  };
}

export function useCreateRuleset() {
  const mutation = useLiveMutation<
    { name: string; group_id: string | null; image_cover: string | null },
    RulesetRow
  >(api.rulesets.create);
  return {
    ...mutation,
    mutate: (
      variables: { input: Ruleset; groupId?: string | null; imageCover?: string | null },
      options?: {
        onSuccess?: (entry: RulesetEntry) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        {
          name: rulesetInputSchema.parse({ name: variables.input.name }).name,
          group_id: variables.groupId ?? null,
          image_cover: variables.imageCover ?? null,
        },
        {
          onSuccess: (entry) =>
            options?.onSuccess?.({
              ...entry,
              id: entry._id,
              name: entry.name,
            }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      input,
      groupId,
      imageCover,
    }: {
      input: Ruleset;
      groupId?: string | null;
      imageCover?: string | null;
    }) => {
      const validatedName = rulesetInputSchema.parse({ name: input.name }).name;
      const entry = await mutation.mutateAsync({
        name: validatedName,
        group_id: groupId ?? null,
        image_cover: imageCover ?? null,
      });
      return { ...entry, id: entry._id, name: validatedName };
    },
  };
}

export function useUpdateRuleset() {
  const mutation = useLiveMutation<
    { id: string; name: string; group_id?: string | null; image_cover?: string | null },
    RulesetRow
  >(api.rulesets.update);
  return {
    ...mutation,
    mutate: (
      variables: {
        input: Ruleset;
        id: string;
        groupId?: string | null;
        imageCover?: string | null;
      },
      options?: {
        onSuccess?: (entry: RulesetEntry) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        {
          id: variables.id,
          name: rulesetInputSchema.parse({ name: variables.input.name }).name,
          group_id: variables.groupId,
          image_cover: variables.imageCover,
        },
        {
          onSuccess: (entry) =>
            options?.onSuccess?.({
              ...entry,
              id: entry._id,
              name: entry.name,
            }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      input,
      id,
      groupId,
      imageCover,
    }: {
      input: Ruleset;
      id: string;
      groupId?: string | null;
      imageCover?: string | null;
    }) => {
      const validatedName = rulesetInputSchema.parse({ name: input.name }).name;
      const entry = await mutation.mutateAsync({
        id,
        name: validatedName,
        group_id: groupId,
        image_cover: imageCover,
      });
      return { ...entry, id: entry._id, name: validatedName };
    },
  };
}

export function useDeleteRuleset() {
  const mutation = useLiveMutation<{ id: string }, void>(api.rulesets.softDelete);
  return {
    ...mutation,
    mutate: (id: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) =>
      mutation.mutate(
        { id },
        {
          onSuccess: () => options?.onSuccess?.(),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (id: string) => await mutation.mutateAsync({ id }),
  };
}

export function useAddFactionToRuleset() {
  return useLiveMutation<
    { ruleset_id: string; faction_id: string },
    { ruleset_id: string; faction_id: string }
  >(api.rulesets.addFaction);
}

export function useRemoveFactionFromRuleset() {
  return useLiveMutation<
    { ruleset_id: string; faction_id: string },
    { ruleset_id: string; faction_id: string }
  >(api.rulesets.removeFaction);
}
