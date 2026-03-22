import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { schema as factionDataSchema } from '@data/factions';

/* Schema (rulesets uses normal columns, not data JSONB – kept here to avoid db:schemas) */
const schema = z.object({
  name: z.string().min(1),
});

/* Types */

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

/* Query Keys */

export const rulesetKeys = {
  all: ['rulesets'] as const,
  lists: () => [...rulesetKeys.all, 'list'] as const,
  list: (filters: object) => [...rulesetKeys.lists(), filters] as const,
  detail: (id: number) => [...rulesetKeys.all, 'detail', id] as const,
  factions: (rulesetId: number) => [...rulesetKeys.detail(rulesetId), 'factions'] as const,
  byFaction: (factionId: string) => [...rulesetKeys.all, 'byFaction', factionId] as const,
  canAccess: (rulesetId: number) => [...rulesetKeys.all, 'canAccess', rulesetId] as const,
};

/* Queries */

export function rulesetsListQueryOptions() {
  return queryOptions({
    queryKey: rulesetKeys.list({ type: 'all' }),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('rulesets')
        .select('*')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      if (!entries) return [];

      return entries.map((entry) => ({
        ...entry,
        name: schema.parse({ name: entry.name }).name,
      }));
    },
  });
}

export function rulesetDetailQueryOptions(id: number) {
  return queryOptions({
    queryKey: rulesetKeys.detail(id),
    queryFn: async () => {
      const { data: entry, error } = await db
        .from('rulesets')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`Ruleset with id ${id} not found`);

      return {
        ...entry,
        name: schema.parse({ name: entry.name }).name,
      };
    },
  });
}

export function rulesetFactionsQueryOptions(rulesetId: number) {
  return queryOptions({
    queryKey: rulesetKeys.factions(rulesetId),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('ruleset_factions')
        .select('faction_id')
        .eq('ruleset_id', rulesetId);

      if (error) throw error;
      if (!entries) return [];

      return entries.map((e) => e.faction_id);
    },
  });
}

export function rulesetFactionsWithDetailsQueryOptions(rulesetId: number) {
  return queryOptions({
    queryKey: [...rulesetKeys.factions(rulesetId), 'details'] as const,
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('ruleset_factions')
        .select('faction_id, factions(id, data)')
        .eq('ruleset_id', rulesetId);

      if (error) throw error;
      if (!entries) return [];

      return entries.map((e) => {
        const raw = (e.factions as { data: unknown } | null)?.data;
        const parsed = raw != null ? factionDataSchema.safeParse(raw) : null;
        const data = parsed?.success ? parsed.data : null;
        return {
          factionId: e.faction_id,
          name: data?.name ?? e.faction_id,
          /** Public URL segment (`factions.data.id`), not the row UUID. */
          urlSlug: data?.id ?? e.faction_id,
        };
      });
    },
  });
}

export function canAccessRulesetQueryOptions(rulesetId: number) {
  return queryOptions({
    queryKey: rulesetKeys.canAccess(rulesetId),
    queryFn: async () => {
      const { data, error } = await db.rpc('current_user_can_access_ruleset', {
        rid: rulesetId,
      });
      if (error) throw error;
      return data === true;
    },
  });
}

export function useCanAccessRuleset(rulesetId: number) {
  return useQuery(canAccessRulesetQueryOptions(rulesetId));
}

export function rulesetsByFactionQueryOptions(factionId: string) {
  return queryOptions({
    queryKey: rulesetKeys.byFaction(factionId),
    queryFn: async () => {
      const { data: junc, error: je } = await db
        .from('ruleset_factions')
        .select('ruleset_id')
        .eq('faction_id', factionId);

      if (je) throw je;
      if (!junc?.length) return [];

      const ids = junc.map((j) => j.ruleset_id);
      const { data: entries, error } = await db
        .from('rulesets')
        .select('*')
        .in('id', ids)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      if (!entries) return [];

      return entries.map((e) => ({ ...e, name: schema.parse({ name: e.name }).name }));
    },
  });
}

export function useRulesetsAll() {
  return useQuery(rulesetsListQueryOptions());
}

export function useRuleset(id: number) {
  return useQuery(rulesetDetailQueryOptions(id));
}

export function useRulesetFactions(rulesetId: number) {
  return useQuery(rulesetFactionsQueryOptions(rulesetId));
}

export function useRulesetFactionsWithDetails(rulesetId: number) {
  return useQuery(rulesetFactionsWithDetailsQueryOptions(rulesetId));
}

/** `factionRowId` is the `factions.id` UUID (FK), not the public slug. */
export function useRulesetsByFaction(factionRowId: string | undefined) {
  return useQuery({
    ...rulesetsByFactionQueryOptions(factionRowId ?? ''),
    enabled: Boolean(factionRowId),
  });
}

/* Mutations */

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
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const validated = schema.parse(input);
      const insert: {
        name: string;
        group_id: string | null;
        owner_id: string;
        image_cover?: string | null;
      } = {
        name: validated.name,
        group_id: groupId ?? null,
        owner_id: user.data.user.id,
      };
      if (imageCover !== undefined) {
        insert.image_cover = imageCover;
      }
      const { data: entry, error } = await db.from('rulesets').insert(insert).select().single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to create ruleset');

      return { ...entry, name: validated.name };
    },
    onSuccess: (entry) => {
      qc.setQueryData(rulesetKeys.detail(entry.id), entry);
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
      id: number;
      groupId?: string | null;
      imageCover?: string | null;
    }) => {
      const validated = schema.parse(input);
      const update: { name?: string; group_id?: string | null; image_cover?: string | null } = {
        name: validated.name,
      };
      if (groupId !== undefined) {
        update.group_id = groupId;
      }
      if (imageCover !== undefined) {
        update.image_cover = imageCover;
      }
      const { data: entry, error } = await db
        .from('rulesets')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`Ruleset with id ${id} not found`);

      return { ...entry, name: validated.name };
    },
    onSuccess: (entry) => {
      qc.setQueryData(rulesetKeys.detail(entry.id), entry);
      qc.invalidateQueries({ queryKey: rulesetKeys.lists() });
    },
  });
}

export function useDeleteRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await db.from('rulesets').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;
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
    mutationFn: async ({ rulesetId, factionId }: { rulesetId: number; factionId: string }) => {
      const { error } = await db.from('ruleset_factions').insert({
        ruleset_id: rulesetId,
        faction_id: factionId,
      });

      if (error) throw error;
      return { rulesetId, factionId };
    },
    onSuccess: ({ rulesetId }) => {
      qc.invalidateQueries({ queryKey: rulesetKeys.factions(rulesetId) });
      qc.invalidateQueries({ queryKey: rulesetKeys.detail(rulesetId) });
    },
  });
}

export function useRemoveFactionFromRuleset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ rulesetId, factionId }: { rulesetId: number; factionId: string }) => {
      const { error } = await db
        .from('ruleset_factions')
        .delete()
        .eq('ruleset_id', rulesetId)
        .eq('faction_id', factionId);

      if (error) throw error;
      return { rulesetId, factionId };
    },
    onSuccess: ({ rulesetId }) => {
      qc.invalidateQueries({ queryKey: rulesetKeys.factions(rulesetId) });
      qc.invalidateQueries({ queryKey: rulesetKeys.detail(rulesetId) });
    },
  });
}
