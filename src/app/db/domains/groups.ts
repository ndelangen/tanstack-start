import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

export type GroupEntry = Tables<'groups'>;
export type GroupInsert = TablesInsert<'groups'>;
export type GroupUpdate = TablesUpdate<'groups'>;

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: object) => [...groupKeys.lists(), filters] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
};

export function useGroup(id: NonNullable<GroupEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () => await db.query<GroupEntry>('groups:getById', { id }),
    initialData: () =>
      qc.getQueryData<GroupEntry[]>(groupKeys.list({ type: 'all' }))?.find((d) => d.id === id),
  });
}

export function useGroupsAll() {
  return useQuery({
    queryKey: groupKeys.list({ type: 'all' }),
    queryFn: async () => await db.query<GroupEntry[]>('groups:list', {}),
  });
}

export function useGroupsByCreator(createdBy: NonNullable<GroupEntry['created_by']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.list({ createdBy }),
    queryFn: async () =>
      await db.query<GroupEntry[]>('groups:listByCreator', { created_by: createdBy }),
    initialData: () =>
      qc
        .getQueryData<GroupEntry[]>(groupKeys.list({ type: 'all' }))
        ?.filter((d) => d.created_by === createdBy),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input }: { input: { name: string } }) =>
      await db.mutation<GroupEntry>('groups:create', { name: input.name }),

    onSuccess: (group) => {
      qc.setQueryData(groupKeys.detail(group.id), group);
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, id }: { input: { name: string }; id: string }) =>
      await db.mutation<GroupEntry>('groups:update', { id, name: input.name }),

    onSuccess: (entry) => {
      qc.setQueryData(groupKeys.detail(entry.id), entry);
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => await db.mutation<string>('groups:remove', { id }),

    onSuccess: (id) => {
      qc.removeQueries({ queryKey: groupKeys.detail(id) });
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}
