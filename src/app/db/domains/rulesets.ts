import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { schema as factionDataSchema } from '@data/factions';

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
      const entries = await db.query<Tables<'rulesets'>[]>('rulesets:list', {});
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
      const entry = await db.query<Tables<'rulesets'>>('rulesets:get', { id });
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
    queryFn: async () => await db.query<string[]>('rulesets:factionIds', { ruleset_id: rulesetId }),
  });
}

export function rulesetFactionsWithDetailsQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: [...rulesetKeys.factions(rulesetId), 'details'] as const,
    queryFn: async () => {
      const entries = await db.query<{ factionId: string; name: string; urlSlug: string }[]>(
        'rulesets:factionDetails',
        { ruleset_id: rulesetId }
      );
      return entries.map((entry) => {
        const parsed = factionDataSchema.safeParse({ id: entry.urlSlug, name: entry.name });
        return {
          factionId: entry.factionId,
          name: parsed.success ? parsed.data.name : entry.name,
          urlSlug: parsed.success ? parsed.data.id : entry.urlSlug,
        };
      });
    },
  });
}

export function canAccessRulesetQueryOptions(rulesetId: string) {
  return queryOptions({
    queryKey: rulesetKeys.canAccess(rulesetId),
    queryFn: async () => await db.query<boolean>('rulesets:canAccess', { ruleset_id: rulesetId }),
  });
}

export function useCanAccessRuleset(rulesetId: string) {
  return useQuery(canAccessRulesetQueryOptions(rulesetId));
}

export function rulesetsByFactionQueryOptions(factionId: string) {
  return queryOptions({
    queryKey: rulesetKeys.byFaction(factionId),
    queryFn: async () => {
      const entries = await db.query<Tables<'rulesets'>[]>('rulesets:listByFaction', {
        faction_id: factionId,
      });
      return entries.map((e) => ({ ...withRulesetId(e), name: schema.parse({ name: e.name }).name }));
    },
  });
}

export function useRulesetsAll() {
  return useQuery(rulesetsListQueryOptions());
}

export function useRuleset(id: string) {
  return useQuery(rulesetDetailQueryOptions(id));
}

export function useRulesetFactions(rulesetId: string) {
  return useQuery(rulesetFactionsQueryOptions(rulesetId));
}

export function useRulesetFactionsWithDetails(rulesetId: string) {
  return useQuery(rulesetFactionsWithDetailsQueryOptions(rulesetId));
}

export function useRulesetsByFaction(factionRowId: string | undefined) {
  return useQuery({
    ...rulesetsByFactionQueryOptions(factionRowId ?? ''),
    enabled: Boolean(factionRowId),
  });
}

export function useCreateRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      groupId,
      imageCover,
    }: {
      input: Ruleset;
      groupId?: string | null;
      imageCover?: string | null;
    }) => {
      const validated = schema.parse(input);
      const entry = await db.mutation<Tables<'rulesets'>>('rulesets:create', {
        name: validated.name,
        group_id: groupId ?? null,
        image_cover: imageCover ?? null,
      });
      return { ...withRulesetId(entry), name: validated.name };
    },
    onSuccess: (entry) => {
      qc.setQueryData(rulesetKeys.detail(entry._id), entry);
      qc.invalidateQueries({ queryKey: rulesetKeys.lists() });
    },
  });
}

export function useUpdateRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
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
      const entry = await db.mutation<Tables<'rulesets'>>('rulesets:update', {
        id,
        name: validated.name,
        group_id: groupId,
        image_cover: imageCover,
      });
      return { ...withRulesetId(entry), name: validated.name };
    },
    onSuccess: (entry) => {
      qc.setQueryData(rulesetKeys.detail(entry._id), entry);
      qc.invalidateQueries({ queryKey: rulesetKeys.lists() });
    },
  });
}

export function useDeleteRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.mutation<void>('rulesets:softDelete', { id });
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: rulesetKeys.detail(id) });
      qc.invalidateQueries({ queryKey: rulesetKeys.lists() });
    },
  });
}

export function useAddFactionToRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ rulesetId, factionId }: { rulesetId: string; factionId: string }) =>
      await db.mutation<{ ruleset_id: string; faction_id: string }>('rulesets:addFaction', {
        ruleset_id: rulesetId,
        faction_id: factionId,
      }),
    onSuccess: ({ ruleset_id }) => {
      qc.invalidateQueries({ queryKey: rulesetKeys.factions(ruleset_id) });
      qc.invalidateQueries({ queryKey: rulesetKeys.detail(ruleset_id) });
    },
  });
}

export function useRemoveFactionFromRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ rulesetId, factionId }: { rulesetId: string; factionId: string }) =>
      await db.mutation<{ ruleset_id: string; faction_id: string }>('rulesets:removeFaction', {
        ruleset_id: rulesetId,
        faction_id: factionId,
      }),
    onSuccess: ({ ruleset_id }) => {
      qc.invalidateQueries({ queryKey: rulesetKeys.factions(ruleset_id) });
      qc.invalidateQueries({ queryKey: rulesetKeys.detail(ruleset_id) });
    },
  });
}
