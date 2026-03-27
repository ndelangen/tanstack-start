import { queryOptions } from '@tanstack/react-query';

import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type GroupMemberRow = Doc<'group_members'>;
export type GroupMemberEntry = GroupMemberRow & { id: string };
export type GroupMemberInsert = GroupMemberEntry;
export type GroupMemberUpdate = Partial<GroupMemberEntry>;
export type GroupMemberStatus = GroupMemberRow['status'];

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
      (
        await db.query<(GroupMemberRow & { groups: { id: string; name: string } | null })[]>(
          api.members.listByUserActiveWithGroups,
          {
            user_id: userId,
          }
        )
      ).map((entry) => ({ ...entry, id: entry._id, groups: entry.groups })),
  });
}

export function groupMembersByStatusQueryOptions(groupId: string, status: GroupMemberStatus) {
  return queryOptions({
    queryKey: memberKeys.byGroupAndStatus(groupId, status),
    queryFn: async () =>
      (
        await db.query<GroupMemberRow[]>(api.members.listByGroupAndStatus, {
          group_id: groupId,
          status,
        })
      ).map((entry) => ({ ...entry, id: entry._id })),
  });
}

export function groupMembersQueryOptions(groupId: string) {
  return queryOptions({
    queryKey: memberKeys.byGroup(groupId),
    queryFn: async () =>
      (
        await db.query<GroupMemberRow[]>(api.members.listByGroup, {
          group_id: groupId,
        })
      ).map((entry) => ({ ...entry, id: entry._id })),
  });
}

export function useUserGroupMemberships(userId: string | undefined) {
  const result = useLiveQuery<
    (GroupMemberRow & { groups: { id: string; name: string } | null })[],
    { user_id: string }
  >(
    api.members.listByUserActiveWithGroups,
    { user_id: userId ?? '' },
    { enabled: Boolean(userId) }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id, groups: entry.groups })),
  };
}

export function useGroupMembers(groupId: string) {
  const result = useLiveQuery<GroupMemberRow[], { group_id: string }>(
    api.members.listByGroup,
    { group_id: groupId },
    { enabled: Boolean(groupId) }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useGroupMembersByStatus(groupId: string, status: GroupMemberStatus) {
  const result = useLiveQuery<GroupMemberRow[], { group_id: string; status: GroupMemberStatus }>(
    api.members.listByGroupAndStatus,
    { group_id: groupId, status },
    { enabled: Boolean(groupId) }
  );
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useGroupMember(groupId: string, userId: string) {
  const result = useLiveQuery<GroupMemberRow, { group_id: string; user_id: string }>(
    api.members.get,
    { group_id: groupId, user_id: userId },
    { enabled: Boolean(groupId) && Boolean(userId) }
  );
  return {
    ...result,
    data: result.data ? { ...result.data, id: result.data._id } : undefined,
  };
}

export function useRequestGroupMembership() {
  const mutation = useLiveMutation<{ group_id: string }, GroupMemberRow>(api.members.request);
  return {
    ...mutation,
    mutate: (
      groupId: string,
      options?: { onSuccess?: (entry: GroupMemberEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { group_id: groupId },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async (groupId: string) => {
      const entry = await mutation.mutateAsync({ group_id: groupId });
      return { ...entry, id: entry._id };
    },
  };
}

export function useApproveGroupMember() {
  const mutation = useLiveMutation<{ group_id: string; user_id: string }, GroupMemberRow>(
    api.members.approve
  );
  return {
    ...mutation,
    mutate: (
      variables: { groupId: string; userId: string },
      options?: { onSuccess?: (entry: GroupMemberEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { group_id: variables.groupId, user_id: variables.userId },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const entry = await mutation.mutateAsync({ group_id: groupId, user_id: userId });
      return { ...entry, id: entry._id };
    },
  };
}

export function useRejectGroupMember() {
  const mutation = useLiveMutation<{ group_id: string; user_id: string }, GroupMemberRow>(
    api.members.reject
  );
  return {
    ...mutation,
    mutate: (
      variables: { groupId: string; userId: string },
      options?: { onSuccess?: (entry: GroupMemberEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { group_id: variables.groupId, user_id: variables.userId },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const entry = await mutation.mutateAsync({ group_id: groupId, user_id: userId });
      return { ...entry, id: entry._id };
    },
  };
}

export function useRemoveGroupMember() {
  const mutation = useLiveMutation<
    { group_id: string; user_id: string },
    { groupId: string; userId: string }
  >(api.members.remove);
  return {
    ...mutation,
    mutate: (
      variables: { groupId: string; userId: string },
      options?: {
        onSuccess?: (entry: { groupId: string; userId: string }) => void;
        onError?: (error: Error) => void;
      }
    ) =>
      mutation.mutate(
        { group_id: variables.groupId, user_id: variables.userId },
        {
          onSuccess: (entry) => options?.onSuccess?.(entry),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      await mutation.mutateAsync({ group_id: groupId, user_id: userId }),
  };
}

export function useAddGroupMember() {
  const mutation = useLiveMutation<{ group_id: string; user_id: string }, GroupMemberRow>(
    api.members.add
  );
  return {
    ...mutation,
    mutate: (
      variables: { groupId: string; userId: string },
      options?: { onSuccess?: (entry: GroupMemberEntry) => void; onError?: (error: Error) => void }
    ) =>
      mutation.mutate(
        { group_id: variables.groupId, user_id: variables.userId },
        {
          onSuccess: (entry) => options?.onSuccess?.({ ...entry, id: entry._id }),
          onError: (error) => options?.onError?.(error),
        }
      ),
    mutateAsync: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const entry = await mutation.mutateAsync({ group_id: groupId, user_id: userId });
      return { ...entry, id: entry._id };
    },
  };
}
