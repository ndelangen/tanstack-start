import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { groupInputSchema } from '@app/groups/validation';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type GroupRow = Doc<'groups'>;
export type GroupEntry = GroupRow & { id: string };
export type GroupInsert = GroupEntry;
export type GroupUpdate = Partial<GroupEntry>;

export async function loadGroupBySlug(slug: string): Promise<GroupEntry> {
  const group = await db.query<GroupRow>(api.groups.getBySlug, { slug });
  return { ...group, id: group._id };
}

export function useGroup(id: string) {
  const result = useLiveQuery<GroupRow, { id: string }>(
    api.groups.getById,
    { id },
    { enabled: !!id }
  );
  return {
    ...result,
    data: result.data ? { ...result.data, id: result.data._id } : undefined,
  };
}

export function useGroupBySlug(
  slug: string | undefined,
  options?: { initialData?: GroupEntry; enabled?: boolean }
) {
  const result = useLiveQuery<GroupRow, { slug: string }>(
    api.groups.getBySlug,
    { slug: slug ?? '' },
    {
      enabled: options?.enabled ?? Boolean(slug),
      initialData: () => options?.initialData ?? undefined,
    }
  );
  return {
    ...result,
    data: result.data ? { ...result.data, id: result.data._id } : undefined,
  };
}

export function useGroupsAll(options?: { initialData?: GroupEntry[] }) {
  const result = useLiveQuery<GroupRow[], Record<string, never>>(api.groups.list, {}, {
    initialData: () => options?.initialData ?? undefined,
  });
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useGroupsByCreator(createdBy: string) {
  const result = useLiveQuery<GroupRow[], { created_by: string }>(
    api.groups.listByCreator,
    { created_by: createdBy },
    { enabled: !!createdBy }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useCreateGroup() {
  const mutation = useLiveMutation<{ name: string }, GroupRow>(api.groups.create);
  const parseGroupInput = (input: { name: string }) => {
    const parsed = groupInputSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid group input');
    }
    return parsed.data;
  };

  return {
    ...mutation,
    mutate: (
      variables: { input: { name: string } },
      options?: { onSuccess?: (group: GroupEntry) => void; onError?: (error: Error) => void }
    ) => {
      try {
        const parsed = parseGroupInput(variables.input);
        mutation.mutate(
          { name: parsed.name },
          {
            onSuccess: (group) => options?.onSuccess?.({ ...group, id: group._id }),
            onError: (error) => options?.onError?.(error),
          }
        );
      } catch (error) {
        options?.onError?.(error instanceof Error ? error : new Error('Invalid group input'));
      }
    },
    mutateAsync: async (variables: { input: { name: string } }) => {
      const parsed = parseGroupInput(variables.input);
      const group = await mutation.mutateAsync({
        name: parsed.name,
      });
      return { ...group, id: group._id };
    },
  };
}

export function useUpdateGroup() {
  const mutation = useLiveMutation<{ id: string; name: string }, GroupRow>(api.groups.update);

  return {
    ...mutation,
    mutate: (
      variables: { input: { name: string }; id: string },
      options?: { onSuccess?: (entry: GroupEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, name: groupInputSchema.parse(variables.input).name },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (variables: { input: { name: string }; id: string }) => {
      const group = await mutation.mutateAsync({
        id: variables.id,
        name: groupInputSchema.parse(variables.input).name,
      });
      return { ...group, id: group._id };
    },
  };
}

export function useDeleteGroup() {
  const mutation = useLiveMutation<{ id: string }, string>(api.groups.remove);
  return {
    ...mutation,
    mutate: (
      id: string,
      options?: { onSuccess?: (deletedId: string) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id },
        {
          onSuccess: (deletedId) => options?.onSuccess?.(deletedId),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (id: string) => await mutation.mutateAsync({ id }),
  };
}
