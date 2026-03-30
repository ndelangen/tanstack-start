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

function toRulesetEntry(entry: RulesetRow): RulesetEntry {
  return {
    ...entry,
    id: entry._id,
    name: rulesetInputSchema.parse({ name: entry.name }).name,
  };
}

export async function loadRulesetsAll(): Promise<RulesetEntry[]> {
  const entries = await db.query<RulesetRow[]>(api.rulesets.list, {});
  return entries.map(toRulesetEntry);
}

export async function loadRuleset(id: string): Promise<RulesetEntry> {
  const entry = await db.query<RulesetRow>(api.rulesets.get, { id });
  return toRulesetEntry(entry);
}

export async function loadRulesetBySlug(slug: string): Promise<RulesetEntry> {
  const entry = await db.query<RulesetRow>(api.rulesets.getBySlug, { slug });
  return toRulesetEntry(entry);
}

export async function loadRulesetFactions(rulesetId: string): Promise<string[]> {
  return await db.query<string[]>(api.rulesets.factionIds, { ruleset_id: rulesetId });
}

export async function loadRulesetFactionsWithDetails(
  rulesetId: string
): Promise<{ factionId: string; name: string; urlSlug: string }[]> {
  return await db.query<{ factionId: string; name: string; urlSlug: string }[]>(
    api.rulesets.factionDetails,
    { ruleset_id: rulesetId }
  );
}

export async function loadCanAccessRuleset(rulesetId: string): Promise<boolean> {
  return await db.query<boolean>(api.rulesets.canAccess, { ruleset_id: rulesetId });
}

export function useCanAccessRuleset(rulesetId: string) {
  return useLiveQuery<boolean, { ruleset_id: string }>(
    api.rulesets.canAccess,
    { ruleset_id: rulesetId },
    { enabled: Boolean(rulesetId) }
  );
}

export async function loadRulesetsByFaction(factionId: string): Promise<RulesetEntry[]> {
  const entries = await db.query<RulesetRow[]>(api.rulesets.listByFaction, {
    faction_id: factionId,
  });
  return entries.map(toRulesetEntry);
}

export function useRulesetsAll(options?: { initialData?: RulesetEntry[] }) {
  const result = useLiveQuery<RulesetRow[], Record<string, never>>(api.rulesets.list, {}, {
    initialData: () => options?.initialData ?? undefined,
  });
  return {
    ...result,
    data: result.data?.map(toRulesetEntry),
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

export function useRulesetBySlug(slug: string, options?: { initialData?: RulesetEntry }) {
  const result = useLiveQuery<RulesetRow, { slug: string }>(
    api.rulesets.getBySlug,
    { slug },
    {
      enabled: Boolean(slug),
      initialData: () => options?.initialData ?? undefined,
    }
  );
  return {
    ...result,
    data: result.data ? toRulesetEntry(result.data) : undefined,
  };
}

export function useRulesetFactions(rulesetId: string) {
  return useLiveQuery<string[], { ruleset_id: string }>(
    api.rulesets.factionIds,
    { ruleset_id: rulesetId },
    { enabled: Boolean(rulesetId) }
  );
}

export function useRulesetFactionsWithDetails(
  rulesetId: string,
  options?: { initialData?: { factionId: string; name: string; urlSlug: string }[] }
) {
  const result = useLiveQuery<
    { factionId: string; name: string; urlSlug: string }[],
    { ruleset_id: string }
  >(api.rulesets.factionDetails, { ruleset_id: rulesetId }, {
    enabled: Boolean(rulesetId),
    initialData: () => options?.initialData ?? undefined,
  });
  return {
    ...result,
    data: result.data,
  };
}

export function useRulesetsByFaction(
  factionRowId: string | undefined,
  options?: { initialData?: RulesetEntry[] }
) {
  const result = useLiveQuery<RulesetRow[], { faction_id: string }>(
    api.rulesets.listByFaction,
    { faction_id: factionRowId ?? '' },
    {
      enabled: Boolean(factionRowId),
      initialData: () => options?.initialData ?? undefined,
    }
  );
  return {
    ...result,
    data: result.data?.map(toRulesetEntry),
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
