import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

/* Types */

export type GroupEntry = Tables<'groups'>;

export type GroupInsert = TablesInsert<'groups'>;

export type GroupUpdate = TablesUpdate<'groups'>;

/* Query Keys */

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: object) => [...groupKeys.lists(), filters] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
};

/* Queries */

export function useGroup(id: NonNullable<GroupEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () => {
      const { data: entry, error } = await db.from('groups').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error(`Group with id ${id} not found`);
      }

      return entry;
    },
    initialData: () =>
      qc.getQueryData<GroupEntry[]>(groupKeys.list({ type: 'all' }))?.find((d) => d.id === id),
  });
}

export function useGroupsAll() {
  return useQuery({
    queryKey: groupKeys.list({ type: 'all' }),
    queryFn: async () => {
      const { data: entries, error } = await db.from('groups').select('*');

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries;
    },
  });
}

export function useGroupsByCreator(createdBy: NonNullable<GroupEntry['created_by']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: groupKeys.list({ createdBy }),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('groups')
        .select('*')
        .eq('created_by', createdBy);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries;
    },
    initialData: () =>
      qc
        .getQueryData<GroupEntry[]>(groupKeys.list({ type: 'all' }))
        ?.filter((d) => d.created_by === createdBy),
  });
}

/* Mutations */

export function useCreateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input }: { input: { name: string } }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('groups')
        .insert({
          created_by: user.data.user.id,
          name: input.name,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!entry) {
        throw new Error('Failed to create group');
      }

      return entry;
    },

    onSuccess: (group) => {
      qc.setQueryData(groupKeys.detail(group.id), group);
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, id }: { input: { name: string }; id: string }) => {
      const { data: entry, error } = await db
        .from('groups')
        .update({ name: input.name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error(`Group with id ${id} not found`);

      return entry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(groupKeys.detail(entry.id), entry);
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('groups').delete().eq('id', id);

      if (error) throw error;
      return id;
    },

    onSuccess: (id) => {
      qc.removeQueries({ queryKey: groupKeys.detail(id) });
      qc.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}
