import { type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';

import { api } from '../../../../convex/_generated/api';

export type GroupEntry = Tables<'groups'>;
export type GroupInsert = TablesInsert<'groups'>;
export type GroupUpdate = TablesUpdate<'groups'>;

function withGroupId(entry: Omit<GroupEntry, 'id'>): GroupEntry {
  return { ...entry, id: entry._id };
}

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: object) => [...groupKeys.lists(), filters] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
};

export function useGroup(id: NonNullable<GroupEntry['_id']>) {
  const result = useLiveQuery<Omit<GroupEntry, 'id'>, { id: NonNullable<GroupEntry['_id']> }>(
    api.groups.getById,
    { id },
    { enabled: id != null }
  );
  return {
    ...result,
    data: result.data ? withGroupId(result.data) : undefined,
  };
}

export function useGroupsAll() {
  const result = useLiveQuery<Omit<GroupEntry, 'id'>[], Record<string, never>>(api.groups.list, {});
  return {
    ...result,
    data: result.data?.map(withGroupId),
  };
}

export function useGroupsByCreator(createdBy: NonNullable<GroupEntry['created_by']>) {
  const result = useLiveQuery<
    Omit<GroupEntry, 'id'>[],
    { created_by: NonNullable<GroupEntry['created_by']> }
  >(api.groups.listByCreator, { created_by: createdBy }, { enabled: createdBy != null });
  return {
    ...result,
    data: result.data?.map(withGroupId),
  };
}

export function useCreateGroup() {
  const mutation = useLiveMutation<{ name: string }, Omit<GroupEntry, 'id'>>(api.groups.create);

  return {
    ...mutation,
    mutate: (
      variables: { input: { name: string } },
      options?: { onSuccess?: (group: GroupEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { name: variables.input.name },
        {
          onSuccess: (group) => options?.onSuccess?.(withGroupId(group)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (variables: { input: { name: string } }) =>
      withGroupId(await mutation.mutateAsync({ name: variables.input.name })),
  };
}

export function useUpdateGroup() {
  const mutation = useLiveMutation<{ id: string; name: string }, Omit<GroupEntry, 'id'>>(
    api.groups.update
  );

  return {
    ...mutation,
    mutate: (
      variables: { input: { name: string }; id: string },
      options?: { onSuccess?: (entry: GroupEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { id: variables.id, name: variables.input.name },
        {
          onSuccess: (entry) => options?.onSuccess?.(withGroupId(entry)),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (variables: { input: { name: string }; id: string }) =>
      withGroupId(await mutation.mutateAsync({ id: variables.id, name: variables.input.name })),
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
