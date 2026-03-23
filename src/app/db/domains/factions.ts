import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { schema } from '@data/factions';

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

export const factionKeys = {
  all: ['factions'] as const,
  lists: () => [...factionKeys.all, 'list'] as const,
  list: (filters: object) => [...factionKeys.lists(), filters] as const,
  detail: (slug: string) => [...factionKeys.all, 'detail', slug] as const,
};

export function factionDetailQueryOptions(slug: string) {
  return queryOptions({
    queryKey: factionKeys.detail(slug),
    queryFn: async () => {
      const entry = await db.query<Tables<'factions'>>('factions:getBySlug', { slug });
      return {
        ...entry,
        data: schema.parse(entry.data),
      };
    },
  });
}

export function factionsListQueryOptions() {
  return queryOptions({
    queryKey: factionKeys.list({ type: 'all' }),
    queryFn: async () => {
      const entries = await db.query<Tables<'factions'>[]>('factions:list', {});
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
      const entries = await db.query<Tables<'factions'>[]>('factions:listByOwner', {
        owner_id: ownerId,
      });
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
      const entries = await db.query<Tables<'factions'>[]>('factions:listByGroup', {
        group_id: groupId,
      });
      return entries.map((entry) => ({
        ...entry,
        data: schema.parse(entry.data),
      }));
    },
  });
}

export function useFaction(slug: string, options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const enabled = options?.enabled ?? true;

  return useQuery({
    ...factionDetailQueryOptions(slug),
    enabled,
    initialData: () =>
      enabled
        ? qc
            .getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))
            ?.find((d) => d.data.id === slug)
        : undefined,
  });
}

export function useFactionsAll() {
  return useQuery(factionsListQueryOptions());
}

export function useFactionsByOwner(ownerId: FactionEntry['owner_id'] | undefined) {
  const qc = useQueryClient();

  return useQuery({
    ...factionsByOwnerQueryOptions(ownerId ?? ''),
    enabled: Boolean(ownerId),
    initialData: () =>
      ownerId
        ? qc
            .getQueryData<FactionEntry[]>(factionKeys.list({ type: 'all' }))
            ?.filter((d) => d.owner_id === ownerId)
        : undefined,
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

export function useCreateFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, groupId }: { input: Faction; groupId?: string | null }) => {
      const validatedData = schema.parse(input);
      const entry = await db.mutation<Tables<'factions'>>('factions:create', {
        data: validatedData,
        group_id: groupId ?? null,
      });
      return {
        ...entry,
        data: schema.parse(entry.data),
      };
    },

    onSuccess: (faction) => {
      qc.setQueryData(factionKeys.detail(faction.data.id), faction);
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}

export function useUpdateFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, id }: { input: Faction; id: string; previousUrlSlug?: string }) => {
      const validatedData = schema.parse(input);
      const entry = await db.mutation<Tables<'factions'>>('factions:update', {
        id,
        data: validatedData,
      });
      return {
        ...entry,
        data: schema.parse(entry.data),
      };
    },

    onSuccess: (entry, variables) => {
      if (variables.previousUrlSlug != null && variables.previousUrlSlug !== entry.data.id) {
        qc.removeQueries({ queryKey: factionKeys.detail(variables.previousUrlSlug) });
      }
      qc.setQueryData(factionKeys.detail(entry.data.id), entry);
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}

export function useDeleteFaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; urlSlug?: string }) => {
      await db.mutation<void>('factions:softDelete', { id });
    },

    onSuccess: (_result, variables) => {
      if (variables.urlSlug != null) {
        qc.removeQueries({ queryKey: factionKeys.detail(variables.urlSlug) });
      } else {
        qc.removeQueries({ queryKey: ['factions', 'detail'] });
      }
      qc.invalidateQueries({ queryKey: factionKeys.lists() });
    },
  });
}
