import { queryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { db, type Tables } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { type ProfileUserEditInput, profileUserEditFormSchema } from '@app/profile/validation';

import { api } from '../../../../convex/_generated/api';

export type ProfileEntry = Tables<'profiles'>;

function withProfileId(entry: Omit<ProfileEntry, 'id'>): ProfileEntry {
  const resolvedId =
    typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
  return { ...entry, id: resolvedId };
}

const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: object) => [...profileKeys.lists(), filters] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  detailBySlug: (slug: string) => [...profileKeys.all, 'detailBySlug', slug] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};

export function profileBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: profileKeys.detailBySlug(slug),
    queryFn: async () =>
      withProfileId(await db.query<Omit<ProfileEntry, 'id'>>(api.profiles.getBySlug, { slug })),
  });
}

export function profilesListQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.list({ type: 'all' }),
    queryFn: async () =>
      (await db.query<Omit<ProfileEntry, 'id'>[]>(api.profiles.list, {})).map(withProfileId),
  });
}

export function currentProfileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      const currentRaw = await db.query<Omit<ProfileEntry, 'id'> | null>(api.profiles.current, {});
      const current = currentRaw ? withProfileId(currentRaw) : null;
      if (current) {
        const needsBackfill = current.slug === 'user' || !current.username || !current.avatar_url;
        if (needsBackfill) {
          return withProfileId(
            await db.mutation<Omit<ProfileEntry, 'id'>>(api.profiles.bootstrapCurrent, {})
          );
        }
        return current;
      }

      const userId = await db.query<string | null>(api.profiles.currentUserId, {});
      if (!userId) {
        return null;
      }

      return withProfileId(
        await db.mutation<Omit<ProfileEntry, 'id'>>(api.profiles.bootstrapCurrent, {})
      );
    },
  });
}

export function useProfile(id: NonNullable<ProfileEntry['_id']>, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const result = useLiveQuery<
    Omit<ProfileEntry, 'id'> | null,
    { id: NonNullable<ProfileEntry['_id']> }
  >(api.profiles.getById, { id }, { enabled: enabled && id != null && id !== '' });
  return {
    ...result,
    data: result.data ? withProfileId(result.data) : undefined,
  };
}

export function useProfileBySlug(slug: string) {
  const result = useLiveQuery<Omit<ProfileEntry, 'id'> | null, { slug: string }>(
    api.profiles.getBySlug,
    { slug },
    { enabled: slug.trim().length > 0 }
  );
  return {
    ...result,
    data: result.data ? withProfileId(result.data) : undefined,
  };
}

export function useProfilesAll() {
  const result = useLiveQuery<Omit<ProfileEntry, 'id'>[], Record<string, never>>(
    api.profiles.list,
    {}
  );
  return {
    ...result,
    data: result.data?.map(withProfileId),
  };
}

export function useCurrentProfile() {
  const current = useLiveQuery<Omit<ProfileEntry, 'id'> | null, Record<string, never>>(
    api.profiles.current,
    {}
  );
  const currentUserId = useLiveQuery<string | null, Record<string, never>>(
    api.profiles.currentUserId,
    {}
  );
  const bootstrap = useLiveMutation<Record<string, never>, Omit<ProfileEntry, 'id'>>(
    api.profiles.bootstrapCurrent
  );
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    const currentValue = current.data;
    if (
      currentValue == null &&
      currentUserId.data &&
      !bootstrapStarted.current &&
      !bootstrap.isPending
    ) {
      bootstrapStarted.current = true;
      bootstrap.mutate({});
    }
  }, [bootstrap, current.data, currentUserId.data]);

  if (current.data) {
    return {
      ...current,
      data: withProfileId(current.data),
    };
  }

  if (bootstrap.data) {
    return {
      ...bootstrap,
      data: withProfileId(bootstrap.data),
      isLoading: bootstrap.isPending,
    };
  }

  return {
    ...current,
    data: undefined,
  };
}

export function useUpdateCurrentProfile() {
  const mutate = useLiveMutation<
    { username: string; avatar_url: string },
    Omit<ProfileEntry, 'id'>
  >(api.profiles.updateCurrent);
  const parseProfileInput = (input: ProfileUserEditInput) => {
    const parsed = profileUserEditFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid profile input');
    }
    return parsed.data;
  };

  return {
    ...mutate,
    mutate: (
      variables: { input: ProfileUserEditInput },
      options?: {
        onSuccess?: (entry: ProfileEntry, vars: { input: ProfileUserEditInput }) => void;
        onError?: (error: Error, vars: { input: ProfileUserEditInput }) => void;
      }
    ) => {
      try {
        const parsed = parseProfileInput(variables.input);
        mutate.mutate(
          {
            username: parsed.username,
            avatar_url: parsed.avatar_url,
          },
          {
            onSuccess: (entry) => options?.onSuccess?.(withProfileId(entry), variables),
            onError: (error) => options?.onError?.(error, variables),
          }
        );
      } catch (error) {
        options?.onError?.(
          error instanceof Error ? error : new Error('Invalid profile input'),
          variables
        );
      }
    },
    mutateAsync: async (variables: { input: ProfileUserEditInput }) => {
      const parsed = parseProfileInput(variables.input);
      const entry = await mutate.mutateAsync({
        username: parsed.username,
        avatar_url: parsed.avatar_url,
      });
      return withProfileId(entry);
    },
  };
}

export type { ProfileUserEditInput };
