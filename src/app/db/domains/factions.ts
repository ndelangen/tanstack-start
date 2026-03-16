import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { schema } from '@data/factions';

/* Types */

export type Faction = z.infer<typeof schema>;

export type FactionEntry = Omit<Tables<'factions'>, 'data'> & {
  data: Faction;
};

export type FactionInsert = Omit<TablesInsert<'factions'>, 'data'> & {
  data: Faction;
};

export type FactionUpdate = Omit<TablesUpdate<'factions'>, 'data'> & {
  data?: Faction;
};

/* Query Keys */

export const factionKeys = {
  all: ['factions'] as const,
  lists: () => [...factionKeys.all, 'list'] as const,
  list: (filters: object) => [...factionKeys.lists(), filters] as const,
  detail: (id: string) => [...factionKeys.all, 'detail', id] as const,
};

/* Queries */

export function factionDetailQueryOptions(id: NonNullable<FactionEntry['id']>) {
  return queryOptions({
    queryKey: factionKeys.detail(id),
    queryFn: async () => {
      const { data: entries, error } = await db.from('factions').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      if (!entries) {
        throw new Error(`Faction with id ${id} not found`);
      }

      return {
        ...entries,
        data: schema.parse(entries.data),
      };
    },
  });
}

export function factionsListQueryOptions() {
  return queryOptions({
    queryKey: factionKeys.list({ type: 'all' }),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('factions')
        .select('*')
        .eq('is_deleted', false);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      }));
    },
  });
}

export function factionsByOwnerQueryOptions(ownerId: NonNullable<FactionEntry['owner_id']>) {
  return queryOptions({
    queryKey: factionKeys.list({ owner: ownerId }),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('factions')
        .select('*')
        .eq('is_deleted', false)
        .eq('owner_id', ownerId);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      }));
    },
  });
}

export function factionsByGroupQueryOptions(groupId: NonNullable<FactionEntry['group_id']>) {
  return queryOptions({
    queryKey: factionKeys.list({ group: groupId }),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('factions')
        .select('*')
        .eq('is_deleted', false)
        .eq('group_id', groupId);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      }));
    },
  });
}

export function useFaction(id: NonNullable<FactionEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    ...factionDetailQueryOptions(id),
    initialData: () =>
      qc.getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))?.find((d) => d.id === id),
  });
}

export function useFactionsAll() {
  return useQuery(factionsListQueryOptions());
}

export function useFactionsByOwner(ownerId: NonNullable<FactionEntry['owner_id']>) {
  const qc = useQueryClient();

  return useQuery({
    ...factionsByOwnerQueryOptions(ownerId),
    initialData: () =>
      qc
        .getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))
        ?.filter((d) => d.owner_id === ownerId),
  });
}

export function useFactionsByGroup(groupId: NonNullable<FactionEntry['group_id']>) {
  const qc = useQueryClient();

  return useQuery({
    ...factionsByGroupQueryOptions(groupId),
    initialData: () =>
      qc
        .getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))
        ?.filter((d) => d.group_id === groupId),
  });
}

/* Mutations */

export function useCreateFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, groupId }: { input: Faction; groupId?: string | null }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const validatedData = schema.parse(input);

      const { data: entry, error } = await db
        .from('factions')
        .insert({
          owner_id: user.data.user.id,
          data: validatedData,
          group_id: groupId ?? null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!entry) {
        throw new Error('Failed to create faction');
      }

      return {
        ...entry,
        data: schema.parse(entry.data),
      };
    },

    onSuccess: (faction) => {
      qc.setQueryData(factionKeys.detail(faction.id), faction);
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}

export function useUpdateFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, id }: { input: Faction; id: string }) => {
      // Validate data before sending to DB (better error handling)
      const validatedData = schema.parse(input);

      const { data: entry, error } = await db
        .from('factions')
        .update({ data: validatedData })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`Faction with id ${id} not found`);

      // Also validate response (defensive)
      return {
        ...entry,
        data: schema.parse(entry.data),
      };
    },

    onSuccess: (entry) => {
      qc.setQueryData(factionKeys.detail(entry.id), entry);
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}

export function useDeleteFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('factions').update({ is_deleted: true }).eq('id', id);

      if (error) throw error;
      return id;
    },

    onSuccess: (id) => {
      qc.removeQueries({ queryKey: factionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}
