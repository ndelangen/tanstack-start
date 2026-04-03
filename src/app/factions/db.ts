import { useQuery } from 'convex/react';
import type { z } from 'zod';

import { db } from '@db/core';
import { type LiveQueryResult, toLiveQueryResult, useLiveMutation } from '@app/db/core/live';
import {
  FactionAssetSourceSchema,
  type FactionInput,
  FactionInputSchema,
} from '@game/schema/faction';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type Faction = FactionInput;
export type FactionData = FactionInput;
export type FactionRow = Doc<'factions'>;
export type FactionEntry = Omit<FactionRow, 'data'> & {
  data: FactionData;
};

/** Subset of {@link FactionEntry} validated by {@link FactionAssetSourceSchema}. */
export type FactionRowAssetSource = Pick<FactionEntry, 'data' | 'slug'>;

type ZodFactionAssetSource = z.infer<typeof FactionAssetSourceSchema>;

/**
 * Same keys as {@link FactionRowAssetSource}. Resolves to `never` if Zod output and row pick diverge.
 */
export type FactionAssetSource = FactionRowAssetSource extends ZodFactionAssetSource
  ? ZodFactionAssetSource extends FactionRowAssetSource
    ? FactionRowAssetSource
    : never
  : never;

export type FactionInsert = Omit<FactionEntry, 'data'> & {
  data: FactionData;
};
export type FactionUpdate = Omit<Partial<FactionEntry>, 'data'> & {
  data?: FactionData;
};

/** Runtime check: row `data` + `slug` match {@link FactionAssetSourceSchema}. */
export function parseFactionAssetSource(entry: FactionRowAssetSource): FactionAssetSource {
  return FactionAssetSourceSchema.parse({ data: entry.data, slug: entry.slug });
}

function toFactionEntry(entry: FactionRow): FactionEntry {
  return {
    ...entry,
    data: FactionInputSchema.parse(entry.data),
  };
}

/** Parse Convex faction rows into typed entries (shared by loaders and group detail). */
export function factionRowsToEntries(rows: FactionRow[]): FactionEntry[] {
  return rows.map(toFactionEntry);
}

export async function loadFactionBySlug(slug: string): Promise<FactionEditorPageData> {
  // Delegate to the editor-page loader so callers get the full shape
  // expected by `useFaction`'s `initialData`.
  return await loadFaction(slug);
}

export async function loadFactionsAll(): Promise<FactionEntry[]> {
  const entries = await db.query<FactionRow[]>(api.factions.list, {});
  return factionRowsToEntries(entries);
}

export async function loadFactionsByOwner(ownerId: string): Promise<FactionEntry[]> {
  const entries = await db.query<FactionRow[]>(api.factions.listByOwner, { owner_id: ownerId });
  return factionRowsToEntries(entries);
}

export async function loadFactionsByGroup(groupId: string): Promise<FactionEntry[]> {
  const entries = await db.query<FactionRow[]>(api.factions.listByGroup, {
    group_id: groupId,
  });
  return factionRowsToEntries(entries);
}

export function useFaction(
  slug: string | undefined,
  options?: {
    enabled?: boolean;
    initialData?: {
      faction: FactionEntry;
      owner: Doc<'profiles'>;
      group: Doc<'groups'> | null;
      memberships: Doc<'group_members'>[];
      groups: Doc<'groups'>[];
    };
  }
) {
  const enabled = (options?.enabled ?? true) && typeof slug === 'string' && slug.length > 0;
  const liveData = useQuery(api.factions.getBySlug, enabled ? { slug: slug as string } : 'skip');
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    faction: result.data ? toFactionEntry(result.data.faction) : undefined,
    owner: result.data?.owner,
    group: result.data?.group,
    memberships: result.data?.memberships,
    groups: result.data?.groups,
  };
}

export function useFactionsAll(options?: { initialData?: FactionEntry[] }) {
  const liveData = useQuery(api.factions.list, {});
  const result = toLiveQueryResult(liveData, true, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data ? factionRowsToEntries(result.data) : undefined,
  };
}

/** Normalized row from `api.factions.listForLoadPicker` (group label + owner username resolved server-side). */
export type FactionLoadPickerRow = {
  id: FactionRow['_id'];
  slug: FactionRow['slug'];
  data: FactionData;
  groupId: FactionRow['group_id'];
  groupLabel: string;
  ownerId: FactionRow['owner_id'];
  ownerUsername: string | null;
};

export type FactionLoadPickerPayload = {
  rows: FactionLoadPickerRow[];
  memberGroupIds: Doc<'groups'>['_id'][];
};

export type FactionLoadPickerQuery = LiveQueryResult<FactionLoadPickerPayload>;

export function useFactionLoadPicker(options?: { initialData?: FactionLoadPickerPayload }) {
  const liveData = useQuery(api.factions.listForLoadPicker, {});
  const result = toLiveQueryResult(liveData, true, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data
      ? {
          rows: result.data.rows.map((row) => ({
            ...row,
            data: FactionInputSchema.parse(row.data),
          })),
          memberGroupIds: result.data.memberGroupIds,
        }
      : undefined,
  };
}

export function useFactionsByOwner(
  ownerId: string | undefined,
  options?: { initialData?: FactionEntry[] }
) {
  const enabled = Boolean(ownerId);
  const args = enabled ? ({ owner_id: ownerId } as never) : 'skip';
  const liveData = useQuery(api.factions.listByOwner, args);
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data ? factionRowsToEntries(result.data) : undefined,
  };
}

export function useFactionsByGroup(groupId: string, options?: { initialData?: FactionEntry[] }) {
  const enabled = Boolean(groupId);
  const args = enabled ? ({ group_id: groupId } as never) : 'skip';
  const liveData = useQuery(api.factions.listByGroup, args);
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data ? factionRowsToEntries(result.data) : undefined,
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

export type FactionEditorPageData = {
  faction: FactionEntry;
  owner: Doc<'profiles'>;
  group: Doc<'groups'> | null;
  memberships: Doc<'group_members'>[];
  groups: Doc<'groups'>[];
};

export type FactionCreatePageData = {
  ownerProfile: Doc<'profiles'> | null;
  groups: Doc<'groups'>[];
  memberships: Doc<'group_members'>[];
};

export async function loadFaction(slug: string): Promise<FactionEditorPageData> {
  const result = await db.query<FactionEditorPageData>(api.factions.getBySlug, {
    slug,
  });
  return {
    ...result,
    faction: toFactionEntry(result.faction as unknown as FactionRow),
  };
}

export async function loadFactionCreatePageContext(): Promise<FactionCreatePageData> {
  return await db.query<FactionCreatePageData>(api.factions.getCreatePageContext, {});
}

export function useFactionCreatePageContext() {
  const liveData = useQuery(api.factions.getCreatePageContext, {});
  const result = toLiveQueryResult(liveData, true, () => undefined);
  return {
    ...result,
  };
}

export function useFactionEditorPageBySlug(slug: string) {
  return useQuery(api.factions.getEditorPageBySlug, { slug });
}
