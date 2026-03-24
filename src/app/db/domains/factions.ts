import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { schema } from '@data/factions';

import { api } from '../../../../convex/_generated/api';

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

function withFactionId(entry: Omit<Tables<'factions'>, 'id'>): Tables<'factions'> {
  return { ...entry, id: entry._id };
}

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
      const entry = await db.query<Tables<'factions'>>(api.factions.getBySlug, { slug });
      return {
        ...withFactionId(entry),
        data: schema.parse(entry.data),
      };
    },
  });
}

export function factionsListQueryOptions() {
  return queryOptions({
    queryKey: factionKeys.list({ type: 'all' }),
    queryFn: async () => {
      const entries = await db.query<Tables<'factions'>[]>(api.factions.list, {});
      return entries.map((entry) => {
        const withId = withFactionId(entry);
        return {
          ...withId,
          data: schema.parse(entry.data),
        };
      });
    },
  });
}

export function factionsByOwnerQueryOptions(ownerId: NonNullable<FactionEntry['owner_id']>) {
  return queryOptions({
    queryKey: factionKeys.list({ owner: ownerId }),
    queryFn: async () => {
      const entries = await db.query<Tables<'factions'>[]>(api.factions.listByOwner, {
        owner_id: ownerId,
      });
      return entries.map((entry) => {
        const withId = withFactionId(entry);
        return {
          ...withId,
          data: schema.parse(entry.data),
        };
      });
    },
  });
}

export function factionsByGroupQueryOptions(groupId: NonNullable<FactionEntry['group_id']>) {
  return queryOptions({
    queryKey: factionKeys.list({ group: groupId }),
    queryFn: async () => {
      const entries = await db.query<Tables<'factions'>[]>(api.factions.listByGroup, {
        group_id: groupId,
      });
      return entries.map((entry) => {
        const withId = withFactionId(entry);
        return {
          ...withId,
          data: schema.parse(entry.data),
        };
      });
    },
  });
}

export function useFaction(slug: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const result = useLiveQuery<Tables<'factions'>, { slug: string }>(
    api.factions.getBySlug,
    { slug },
    { enabled: enabled && slug.length > 0 }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...withFactionId(result.data),
          data: schema.parse(result.data.data),
        }
      : undefined,
  };
}

export function useFactionsAll() {
  const result = useLiveQuery<Tables<'factions'>[], Record<string, never>>(api.factions.list, {});
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...withFactionId(entry),
      data: schema.parse(entry.data),
    })),
  };
}

export function useFactionsByOwner(ownerId: FactionEntry['owner_id'] | undefined) {
  const result = useLiveQuery<
    Tables<'factions'>[],
    { owner_id: NonNullable<FactionEntry['owner_id']> }
  >(
    api.factions.listByOwner,
    { owner_id: ownerId as NonNullable<FactionEntry['owner_id']> },
    { enabled: Boolean(ownerId) }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...withFactionId(entry),
      data: schema.parse(entry.data),
    })),
  };
}

export function useFactionsByGroup(groupId: NonNullable<FactionEntry['group_id']>) {
  const result = useLiveQuery<
    Tables<'factions'>[],
    { group_id: NonNullable<FactionEntry['group_id']> }
  >(api.factions.listByGroup, { group_id: groupId }, { enabled: Boolean(groupId) });
  return {
    ...result,
    data: result.data?.map((entry) => ({
      ...withFactionId(entry),
      data: schema.parse(entry.data),
    })),
  };
}

export function useCreateFaction() {
  const mutation = useLiveMutation<{ data: Faction; group_id?: string | null }, Tables<'factions'>>(
    api.factions.create
  );

  return {
    ...mutation,
    mutate: (
      variables: { input: Faction; groupId?: string | null },
      options?: { onSuccess?: (faction: FactionEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        {
          data: schema.parse(variables.input),
          group_id: variables.groupId ?? null,
        },
        {
          onSuccess: (entry) =>
            options?.onSuccess?.({
              ...withFactionId(entry),
              data: schema.parse(entry.data),
            }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ input, groupId }: { input: Faction; groupId?: string | null }) => {
      const validatedData = schema.parse(input);
      const entry = await mutation.mutateAsync({
        data: validatedData,
        group_id: groupId ?? null,
      });
      const withId = withFactionId(entry);
      return {
        ...withId,
        data: schema.parse(entry.data),
      };
    },
  };
}

export function useUpdateFaction() {
  const mutation = useLiveMutation<{ id: string; data: Faction }, Tables<'factions'>>(
    api.factions.update
  );

  return {
    ...mutation,
    mutate: (
      variables: { input: Faction; id: string; previousUrlSlug?: string },
      options?: { onSuccess?: (entry: FactionEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, data: schema.parse(variables.input) },
        {
          onSuccess: (entry) =>
            options?.onSuccess?.({
              ...withFactionId(entry),
              data: schema.parse(entry.data),
            }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({
      input,
      id,
    }: {
      input: Faction;
      id: string;
      previousUrlSlug?: string;
    }) => {
      const validatedData = schema.parse(input);
      const entry = await mutation.mutateAsync({
        id,
        data: validatedData,
      });
      const withId = withFactionId(entry);
      return {
        ...withId,
        data: schema.parse(entry.data),
      };
    },
  };
}

export function useDeleteFaction() {
  const mutation = useLiveMutation<{ id: string }, void>(api.factions.softDelete);
  return {
    ...mutation,
    mutate: (
      variables: { id: string; urlSlug?: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id },
        {
          onSuccess: () => options?.onSuccess?.(),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id }: { id: string; urlSlug?: string }) =>
      await mutation.mutateAsync({ id }),
  };
}
