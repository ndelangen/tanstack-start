import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { groupInputSchema } from '@app/groups/validation';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type GroupRow = Doc<'groups'>;
export type GroupEntry = GroupRow & { id: string };
export type GroupInsert = GroupEntry;
export type GroupUpdate = Partial<GroupEntry>;

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: object) => [...groupKeys.lists(), filters] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
};

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

export function useGroupsAll() {
  const result = useLiveQuery<GroupRow[], Record<string, never>>(api.groups.list, {});
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

  return {
    ...mutation,
    mutate: (
      variables: { input: { name: string } },
      options?: { onSuccess?: (group: GroupEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { name: groupInputSchema.parse(variables.input).name },
        {
          onSuccess: (group) => options?.onSuccess?.({ ...group, id: group._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (variables: { input: { name: string } }) => {
      const group = await mutation.mutateAsync({
        name: groupInputSchema.parse(variables.input).name,
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
