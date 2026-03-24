import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { schema as factionDataSchema } from '@data/factions';

import { api } from '../../../../convex/_generated/api';

const schema = z.object({
  name: z.string().min(1),
});

export type Ruleset = z.infer<typeof schema>;
export type RulesetEntry = Omit<Tables<'rulesets'>, 'name'> & {
  name: Ruleset['name'];
};
export type RulesetInsert = Omit<TablesInsert<'rulesets'>, 'name'> & {
  name: Ruleset['name'];
};
export type RulesetUpdate = Omit<TablesUpdate<'rulesets'>, 'name'> & {
  name?: Ruleset['name'];
};

function withRulesetId(entry: Omit<Tables<'rulesets'>, 'id'>): Tables<'rulesets'> {
  return { ...entry, id: entry._id };
}

export const rulesetKeys = {
  all: ['rulesets'] as const,
  lists: () => [...rulesetKeys.all, 'list'] as const,
  list: (filters: object) => [...rulesetKeys.lists(), filters] as const,
  detail: (id: string) => [...rulesetKeys.all, 'detail', id] as const,
  factions: (rulesetId: string) => [...rulesetKeys.detail(rulesetId), 'factions'] as const,
  byFaction: (factionId: string) => [...rulesetKeys.all, 'byFaction', factionId] as const,
  canAccess: (rulesetId: string) => [...rulesetKeys.all, 'canAccess', rulesetId] as const,
};

export function rulesetsListQueryOptions() {
  return queryOptions({
    queryKey: rulesetKeys.list({ type: 'all' }),
    queryFn: async () => {
      const entries = await db.query<Tables<'rulesets'>[]>(api.rulesets.list, {});
      return entries.map((entry) => ({
        ...withRulesetId(entry),
        name: schema.parse({ name: entry.name }).name,
      }));
    },
  });
}

export function rulesetDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: rulesetKeys.detail(id),
    queryFn: async () => {
      const entry = await db.query<Tables<'rulesets'>>(api.rulesets.get, { id });
      return {
        ...withRulesetId(entry),
        name: schema.parse({ name: entry.name }).name,
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
      return entries.map((entry) => {
        const parsed = factionDataSchema.safeParse({ slug: entry.urlSlug, name: entry.name });
        return {
          factionId: entry.factionId,
          name: parsed.success ? parsed.data.name : entry.name,
          urlSlug: parsed.success ? parsed.data.slug : entry.urlSlug,
        };
      });
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
      const entries = await db.query<Tables<'rulesets'>[]>(api.rulesets.listByFaction, {
        faction_id: factionId,
      });
      return entries.map((e) => ({
        ...withRulesetId(e),
        name: schema.parse({ name: e.name }).name,
      }));
    },
  });
}

export function useRulesetsAll() {
  const result = useLiveQuery<Tables<'rulesets'>[], Record<string, never>>(api.rulesets.list, {});
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...withRulesetId(entry),
      name: schema.parse({ name: entry.name }).name,
    })),
  };
}

export function useRuleset(id: string) {
  const result = useLiveQuery<Tables<'rulesets'>, { id: string }>(
    api.rulesets.get,
    { id },
    { enabled: Boolean(id) }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...withRulesetId(result.data),
          name: schema.parse({ name: result.data.name }).name,
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
    data: result.data?.map((entry) => {
      const parsed = factionDataSchema.safeParse({ slug: entry.urlSlug, name: entry.name });
      return {
        factionId: entry.factionId,
        name: parsed.success ? parsed.data.name : entry.name,
        urlSlug: parsed.success ? parsed.data.slug : entry.urlSlug,
      };
    }),
  };
}

export function useRulesetsByFaction(factionRowId: string | undefined) {
  const result = useLiveQuery<Tables<'rulesets'>[], { faction_id: string }>(
    api.rulesets.listByFaction,
    { faction_id: factionRowId ?? '' },
    { enabled: Boolean(factionRowId) }
  );
  return {
    ...result,
    data: result.data?.map((e) => ({
      ...withRulesetId(e),
      name: schema.parse({ name: e.name }).name,
    })),
  };
}

export function useCreateRuleset() {
  const mutation = useLiveMutation<
    { name: string; group_id: string | null; image_cover: string | null },
    Tables<'rulesets'>
  >(api.rulesets.create);
  return {
    ...mutation,
    mutate: (
      variables: { input: Ruleset; groupId?: string | null; imageCover?: string | null },
      options?: {
        onSuccess?: (entry: Tables<'rulesets'>) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        {
          name: schema.parse(variables.input).name,
          group_id: variables.groupId ?? null,
          image_cover: variables.imageCover ?? null,
        },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...withRulesetId(entry), name: entry.name }),
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
      const validated = schema.parse(input);
      const entry = await mutation.mutateAsync({
        name: validated.name,
        group_id: groupId ?? null,
        image_cover: imageCover ?? null,
      });
      return { ...withRulesetId(entry), name: validated.name };
    },
  };
}

export function useUpdateRuleset() {
  const mutation = useLiveMutation<
    { id: string; name: string; group_id?: string | null; image_cover?: string | null },
    Tables<'rulesets'>
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
        onSuccess?: (entry: Tables<'rulesets'>) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        {
          id: variables.id,
          name: schema.parse(variables.input).name,
          group_id: variables.groupId,
          image_cover: variables.imageCover,
        },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...withRulesetId(entry), name: entry.name }),
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
      const validated = schema.parse(input);
      const entry = await mutation.mutateAsync({
        id,
        name: validated.name,
        group_id: groupId,
        image_cover: imageCover,
      });
      return { ...withRulesetId(entry), name: validated.name };
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
