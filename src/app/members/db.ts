import { useMemo } from 'react';

import { db } from '@db/core';
import { toLiveQueryResult, useLiveMutation } from '@app/db/core/live';
import { useCurrentProfile } from '@db/profiles';
import { useQuery } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type GroupMemberRow = Doc<'group_members'>;
export type GroupMemberEntry = GroupMemberRow & { id: string };
export type GroupMemberInsert = GroupMemberEntry;
export type GroupMemberUpdate = Partial<GroupMemberEntry>;
export type GroupMemberStatus = GroupMemberRow['status'];

export type UserGroupMembershipWithGroup = GroupMemberEntry & {
  groups: { id: string; name: string; slug: string } | null;
};

export async function loadUserGroupMemberships(
  userId: string
): Promise<UserGroupMembershipWithGroup[]> {
  const entries = await db.query<
    (GroupMemberRow & { groups: { id: string; name: string; slug: string } | null })[]
  >(api.members.listByUserActiveWithGroups, {
    user_id: userId,
  });
  return entries.map((entry) => ({ ...entry, id: entry._id, groups: entry.groups }));
}

export async function loadGroupMembersByStatus(
  groupId: string,
  status: GroupMemberStatus
): Promise<GroupMemberEntry[]> {
  const entries = await db.query<GroupMemberRow[]>(api.members.listByGroupAndStatus, {
    group_id: groupId,
    status,
  });
  return entries.map((entry) => ({ ...entry, id: entry._id }));
}

export async function loadGroupMembers(groupId: string): Promise<GroupMemberEntry[]> {
  const entries = await db.query<GroupMemberRow[]>(api.members.listByGroup, {
    group_id: groupId,
  });
  return entries.map((entry) => ({ ...entry, id: entry._id }));
}

export function useUserGroupMemberships(
  userId: string | undefined,
  options?: { initialData?: UserGroupMembershipWithGroup[] }
) {
  const enabled = Boolean(userId);
  const args = enabled ? ({ user_id: userId ?? '' } as never) : 'skip';
  const liveData = useQuery(api.members.listByUserActiveWithGroups, args) as
    | (GroupMemberRow & { groups: { id: string; name: string } | null })[]
    | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id, groups: entry.groups })),
  };
}

export function useCurrentUserMemberships(options?: { enabled?: boolean }) {
  const profile = useCurrentProfile();
  const userId = profile.data?.id;

  const enabled = (options?.enabled ?? true) && Boolean(userId);

  const memberships = useUserGroupMemberships(enabled ? userId : undefined, {
    initialData: [],
  });

  const groups = useMemo(
    () =>
      (memberships.data ?? [])
        .map((membership) => membership.groups)
        .filter(
          (group): group is { id: string; name: string; slug: string } =>
            Boolean(group)
        ),
    [memberships.data]
  );

  return {
    ...memberships,
    groups,
  };
}

export function useGroupMembers(groupId: string, options?: { initialData?: GroupMemberEntry[] }) {
  const enabled = Boolean(groupId);
  const args = enabled ? ({ group_id: groupId } as never) : 'skip';
  const liveData = useQuery(api.members.listByGroup, args) as GroupMemberRow[] | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useGroupMembersByStatus(
  groupId: string,
  status: GroupMemberStatus,
  options?: { initialData?: GroupMemberEntry[] }
) {
  const enabled = Boolean(groupId);
  const args = enabled ? ({ group_id: groupId, status } as never) : 'skip';
  const liveData = useQuery(api.members.listByGroupAndStatus, args) as GroupMemberRow[] | undefined;
  const result = toLiveQueryResult(liveData, enabled, () => options?.initialData ?? undefined);
  return {
    ...result,
    data: result.data?.map((entry) => ({ ...entry, id: entry._id })),
  };
}

export function useGroupMember(groupId: string, userId: string) {
  const enabled = Boolean(groupId) && Boolean(userId);
  const args = enabled ? ({ group_id: groupId, user_id: userId } as never) : 'skip';
  const liveData = useQuery(api.members.get, args) as GroupMemberRow | undefined;
  const result = toLiveQueryResult(liveData, enabled);
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
