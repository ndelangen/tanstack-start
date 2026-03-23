import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db, type Enums, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

export type GroupMemberEntry = Tables<'group_members'>;
export type GroupMemberInsert = TablesInsert<'group_members'>;
export type GroupMemberUpdate = TablesUpdate<'group_members'>;
export type GroupMemberStatus = Enums<'group_member_status'>;

export const memberKeys = {
  all: ['group_members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: object) => [...memberKeys.lists(), filters] as const,
  detail: (groupId: string, userId: string) =>
    [...memberKeys.all, 'detail', groupId, userId] as const,
  byGroup: (groupId: string) => [...memberKeys.all, 'group', groupId] as const,
  byGroupAndStatus: (groupId: string, status: GroupMemberStatus) =>
    [...memberKeys.byGroup(groupId), status] as const,
  byUser: (userId: string) => [...memberKeys.all, 'user', userId] as const,
};

export type UserGroupMembershipWithGroup = GroupMemberEntry & {
  groups: { id: string; name: string } | null;
};

export function userGroupMembershipsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: memberKeys.byUser(userId),
    queryFn: async () =>
      await db.query<UserGroupMembershipWithGroup[]>('members:listByUserActiveWithGroups', {
        user_id: userId,
      }),
  });
}

export function useUserGroupMemberships(userId: string | undefined) {
  return useQuery({
    ...userGroupMembershipsQueryOptions(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: memberKeys.byGroup(groupId),
    queryFn: async () =>
      await db.query<GroupMemberEntry[]>('members:listByGroup', {
        group_id: groupId,
      }),
  });
}

export function useGroupMembersByStatus(groupId: string, status: GroupMemberStatus) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: memberKeys.byGroupAndStatus(groupId, status),
    queryFn: async () =>
      await db.query<GroupMemberEntry[]>('members:listByGroupAndStatus', {
        group_id: groupId,
        status,
      }),
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
    queryFn: async () =>
      await db.query<GroupMemberEntry>('members:get', {
        group_id: groupId,
        user_id: userId,
      }),
    initialData: () =>
      qc
        .getQueryData<GroupMemberEntry[]>(memberKeys.byGroup(groupId))
        ?.find((m) => m.user_id === userId),
  });
}

export function useRequestGroupMembership() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) =>
      await db.mutation<GroupMemberEntry>('members:request', {
        group_id: groupId,
      }),

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useApproveGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      await db.mutation<GroupMemberEntry>('members:approve', {
        group_id: groupId,
        user_id: userId,
      }),

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useRejectGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      await db.mutation<GroupMemberEntry>('members:reject', {
        group_id: groupId,
        user_id: userId,
      }),

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      await db.mutation<{ groupId: string; userId: string }>('members:remove', {
        group_id: groupId,
        user_id: userId,
      }),

    onSuccess: ({ groupId, userId }) => {
      qc.removeQueries({ queryKey: memberKeys.detail(groupId, userId) });
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(groupId) });
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      await db.mutation<GroupMemberEntry>('members:add', {
        group_id: groupId,
        user_id: userId,
      }),

    onSuccess: (entry) => {
      qc.setQueryData(memberKeys.detail(entry.group_id, entry.user_id), entry);
      qc.invalidateQueries({ queryKey: memberKeys.byGroup(entry.group_id) });
    },
  });
}
