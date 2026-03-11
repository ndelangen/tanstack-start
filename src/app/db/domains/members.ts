import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

/* Types */

export type GroupMemberEntry = Tables<'group_members'>;

export type GroupMemberInsert = TablesInsert<'group_members'>;

export type GroupMemberUpdate = TablesUpdate<'group_members'>;

export type GroupMemberStatus = 'pending' | 'approved' | 'rejected';

/* Query Keys */

export const memberKeys = {
  all: ['group_members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: object) => [...memberKeys.lists(), filters] as const,
  detail: (groupId: string, userId: string) =>
    [...memberKeys.all, 'detail', groupId, userId] as const,
  byGroup: (groupId: string) => [...memberKeys.all, 'group', groupId] as const,
  byGroupAndStatus: (groupId: string, status: GroupMemberStatus) =>
    [...memberKeys.byGroup(groupId), status] as const,
};

/* Queries */

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: memberKeys.byGroup(groupId),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries as GroupMemberEntry[];
    },
  });
}

export function useGroupMembersByStatus(groupId: string, status: GroupMemberStatus) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: memberKeys.byGroupAndStatus(groupId, status),
    queryFn: async () => {
      const { data: entries, error } = await db
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', status);

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries as GroupMemberEntry[];
    },
    initialData: () =>
      qc
        .getQueryData<GroupMemberEntry[]>(memberKeys.byGroup(groupId))
        ?.filter((m) => m.status === status),
  });
}

export function useGroupMember(groupId: string, userId: string) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: memberKeys.detail(groupId, userId),
    queryFn: async () => {
      const { data: entry, error } = await db
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error(`Group member not found`);
      }

      return entry as GroupMemberEntry;
    },
    initialData: () =>
      qc
        .getQueryData<GroupMemberEntry[]>(memberKeys.byGroup(groupId))
        ?.find((m) => m.user_id === userId),
  });
}

/* Mutations */

export function useRequestGroupMembership() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.data.user.id,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!entry) {
        throw new Error('Failed to request group membership');
      }

      return entry as GroupMemberEntry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useApproveGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('group_members')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.data.user.id,
        })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to approve group member');

      return entry as GroupMemberEntry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useRejectGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('group_members')
        .update({
          status: 'rejected',
        })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to reject group member');

      return entry as GroupMemberEntry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await db
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      return { groupId, userId };
    },

    onSuccess: ({ groupId, userId }) => {
      qc.removeQueries({ queryKey: memberKeys.detail(groupId, userId) });
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(groupId) });
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.data.user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!entry) {
        throw new Error('Failed to add group member');
      }

      return entry as GroupMemberEntry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}
