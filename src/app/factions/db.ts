import { queryOptions } from '@tanstack/react-query';

import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import {
  type FactionInput,
  FactionInputSchema,
  type FactionStored,
  FactionStoredSchema,
} from '@game/schema/faction';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type Faction = FactionInput;
export type FactionData = FactionStored;
export type FactionRow = Doc<'factions'>;
export type FactionEntry = Omit<FactionRow, 'data'> & {
  data: FactionData;
  id: string;
};
export type FactionInsert = Omit<FactionEntry, 'data'> & {
  data: FactionData;
};
export type FactionUpdate = Omit<Partial<FactionEntry>, 'data'> & {
  data?: FactionData;
};

function withFactionId(entry: FactionRow): FactionEntry {
  return { ...entry, id: entry._id };
}

function toFactionEntry(entry: FactionRow): FactionEntry {
  return {
    ...withFactionId(entry),
    data: FactionStoredSchema.parse(entry.data),
  };
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
      const entry = await db.query<FactionRow>(api.factions.getBySlug, { slug });
      return toFactionEntry(entry);
    },
  });
}

export function factionsListQueryOptions() {
  return queryOptions({
    queryKey: factionKeys.list({ type: 'all' }),
    queryFn: async () => {
      const entries = await db.query<FactionRow[]>(api.factions.list, {});
      return entries.map(toFactionEntry);
    },
  });
}

export function factionsByOwnerQueryOptions(ownerId: string) {
  return queryOptions({
    queryKey: factionKeys.list({ owner: ownerId }),
    queryFn: async () => {
      const entries = await db.query<FactionRow[]>(api.factions.listByOwner, { owner_id: ownerId });
      return entries.map(toFactionEntry);
    },
  });
}

export function factionsByGroupQueryOptions(groupId: string) {
  return queryOptions({
    queryKey: factionKeys.list({ group: groupId }),
    queryFn: async () => {
      const entries = await db.query<FactionRow[]>(api.factions.listByGroup, {
        group_id: groupId,
      });
      return entries.map(toFactionEntry);
    },
  });
}

export function useFaction(slug: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const result = useLiveQuery<FactionRow, { slug: string }>(
    api.factions.getBySlug,
    { slug },
    { enabled: enabled && slug.length > 0 }
  );
  return {
    ...result,
    data: result.data ? toFactionEntry(result.data) : undefined,
  };
}

export function useFactionsAll() {
  const result = useLiveQuery<FactionRow[], Record<string, never>>(api.factions.list, {});
  return {
    ...result,
    data: result.data?.map(toFactionEntry),
  };
}

export function useFactionsByOwner(ownerId: string | undefined) {
  const result = useLiveQuery<FactionRow[], { owner_id: string }>(
    api.factions.listByOwner,
    { owner_id: ownerId ?? '' },
    { enabled: Boolean(ownerId) }
  );
  return {
    ...result,
    data: result.data?.map(toFactionEntry),
  };
}

export function useFactionsByGroup(groupId: string) {
  const result = useLiveQuery<FactionRow[], { group_id: string }>(
    api.factions.listByGroup,
    { group_id: groupId },
    { enabled: Boolean(groupId) }
  );
  return {
    ...result,
    data: result.data?.map(toFactionEntry),
  };
}

export function useCreateFaction() {
  const mutation = useLiveMutation<{ data: Faction; group_id: string | null }, FactionRow>(
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
          data: FactionInputSchema.parse(variables.input),
          group_id: variables.groupId ?? null,
        },
        {
          onSuccess: (entry) => options?.onSuccess?.(toFactionEntry(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ input, groupId }: { input: Faction; groupId?: string | null }) => {
      const validatedData = FactionInputSchema.parse(input);
      const entry = await mutation.mutateAsync({
        data: validatedData,
        group_id: groupId ?? null,
      });
      return toFactionEntry(entry);
    },
  };
}

export function useUpdateFaction() {
  const mutation = useLiveMutation<{ id: string; data: Faction }, FactionRow>(api.factions.update);

  return {
    ...mutation,
    mutate: (
      variables: { input: Faction; id: string; previousUrlSlug?: string },
      options?: { onSuccess?: (entry: FactionEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, data: FactionInputSchema.parse(variables.input) },
        {
          onSuccess: (entry) => options?.onSuccess?.(toFactionEntry(entry)),
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
      const validatedData = FactionInputSchema.parse(input);
      const entry = await mutation.mutateAsync({
        id,
        data: validatedData,
      });
      return toFactionEntry(entry);
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

export function useSetFactionGroup() {
  const mutation = useLiveMutation<{ id: string; group_id: string | null }, FactionRow>(
    api.factions.setGroup
  );
  return {
    ...mutation,
    mutate: (
      variables: { id: string; groupId: string | null },
      options?: { onSuccess?: (entry: FactionEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, group_id: variables.groupId },
        {
          onSuccess: (entry) => options?.onSuccess?.(toFactionEntry(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ id, groupId }: { id: string; groupId: string | null }) => {
      const entry = await mutation.mutateAsync({ id, group_id: groupId });
      return toFactionEntry(entry);
    },
  };
}
