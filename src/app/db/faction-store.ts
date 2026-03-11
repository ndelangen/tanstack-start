import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@app/db/connect';
import type { Faction, FactionEntry } from '@app/db/faction-types';
import { schema } from '@data/factions';

/* Query Keys */

export const factionKeys = {
  all: ['factions'] as const,
  lists: () => [...factionKeys.all, 'list'] as const,
  list: (filters: object) => [...factionKeys.lists(), filters] as const,
  detail: (id: string) => [...factionKeys.all, 'detail', id] as const,
};

/* Queries */

export function useFaction(id: NonNullable<FactionEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: factionKeys.detail(id),
    queryFn: async () => {
      const { data: entries, error } = await db.from('factions').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      if (!entries) {
        throw new Error(`Faction with id ${id} not found`);
      }

      // Validate data field after reading from DB
      return {
        ...entries,
        data: schema.parse(entries.data),
      } as FactionEntry;
    },
    initialData: () =>
      qc.getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))?.find((d) => d.id === id),
  });
}

export function useFactionsAll() {
  return useQuery({
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

      // Validate data field for each faction after reading from DB
      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      })) as FactionEntry[];
    },
  });
}

export function useFactionsByOwner(ownerId: NonNullable<FactionEntry['owner_id']>) {
  const qc = useQueryClient();

  return useQuery({
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

      // Validate data field for each faction after reading from DB
      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      })) as FactionEntry[];
    },
    initialData: () =>
      qc
        .getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))
        ?.filter((d) => d.owner_id === ownerId),
  });
}

export function useFactionsByGroup(groupId: NonNullable<FactionEntry['group_id']>) {
  const qc = useQueryClient();

  return useQuery({
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

      // Validate data field for each faction after reading from DB
      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      })) as FactionEntry[];
    },
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
    mutationFn: async ({ data, groupId }: { data: Faction; groupId?: string | null }) => {
      const user = await db.auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      // Validate data before sending to DB (better error handling)
      const validatedData = schema.parse(data);

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
      } as FactionEntry;
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
    mutationFn: async ({ id, data }: { id: string; data: Faction }) => {
      // Validate data before sending to DB (better error handling)
      const validatedData = schema.parse(data);

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
      } as FactionEntry;
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
