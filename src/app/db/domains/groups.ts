import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

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
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () =>
      withGroupId(await db.query<Omit<GroupEntry, 'id'>>('groups:getById', { id })),
    initialData: () =>
      qc.getQueryData<GroupEntry[]>(groupKeys.list({ type: 'all' }))?.find((d) => d._id === id),
  });
}

export function useGroupsAll() {
  return useQuery({
    queryKey: groupKeys.list({ type: 'all' }),
    queryFn: async () =>
      (await db.query<Omit<GroupEntry, 'id'>[]>('groups:list', {})).map(withGroupId),
  });
}

export function useGroupsByCreator(createdBy: NonNullable<GroupEntry['created_by']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.list({ createdBy }),
    queryFn: async () =>
      (
        await db.query<Omit<GroupEntry, 'id'>[]>('groups:listByCreator', { created_by: createdBy })
      ).map(withGroupId),
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
      withGroupId(await db.mutation<Omit<GroupEntry, 'id'>>('groups:create', { name: input.name })),

    onSuccess: (group) => {
      qc.setQueryData(groupKeys.detail(group._id), group);
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, id }: { input: { name: string }; id: string }) =>
      withGroupId(
        await db.mutation<Omit<GroupEntry, 'id'>>('groups:update', { id, name: input.name })
      ),

    onSuccess: (entry) => {
      qc.setQueryData(groupKeys.detail(entry._id), entry);
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
