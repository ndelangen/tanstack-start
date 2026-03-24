import { queryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { type ProfileUserEditInput, profileUserEditFormSchema } from '@app/profile/validation';

import { api } from '../../../../convex/_generated/api';
import type { Doc } from '../../../../convex/_generated/dataModel';

export type ProfileRow = Doc<'profiles'>;
export type ProfileEntry = ProfileRow & { id: ProfileRow['user_id'] | ProfileRow['_id'] };

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
    queryFn: async () => {
      const entry = await db.query<ProfileRow>(api.profiles.getBySlug, { slug });
      const resolvedId =
        typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
      return { ...entry, id: resolvedId };
    },
  });
}

export function profilesListQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.list({ type: 'all' }),
    queryFn: async () =>
      (await db.query<ProfileRow[]>(api.profiles.list, {})).map((entry) => {
        const resolvedId =
          typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
        return { ...entry, id: resolvedId };
      }),
  });
}

export function currentProfileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      const currentRaw = await db.query<ProfileRow | null>(api.profiles.current, {});
      const current = currentRaw
        ? {
            ...currentRaw,
            id:
              typeof currentRaw.user_id === 'string' && currentRaw.user_id.length > 0
                ? currentRaw.user_id
                : currentRaw._id,
          }
        : null;
      if (current) {
        const needsBackfill = current.slug === 'user' || !current.username || !current.avatar_url;
        if (needsBackfill) {
          const entry = await db.mutation<ProfileRow>(api.profiles.bootstrapCurrent, {});
          const resolvedId =
            typeof entry.user_id === 'string' && entry.user_id.length > 0
              ? entry.user_id
              : entry._id;
          return { ...entry, id: resolvedId };
        }
        return current;
      }

      const userId = await db.query<string | null>(api.profiles.currentUserId, {});
      if (!userId) {
        return null;
      }

      const entry = await db.mutation<ProfileRow>(api.profiles.bootstrapCurrent, {});
      const resolvedId =
        typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
      return { ...entry, id: resolvedId };
    },
  });
}

export function useProfile(id: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const result = useLiveQuery<ProfileRow | null, { id: string }>(
    api.profiles.getById,
    { id },
    { enabled: enabled && id != null && id !== '' }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id:
            typeof result.data.user_id === 'string' && result.data.user_id.length > 0
              ? result.data.user_id
              : result.data._id,
        }
      : undefined,
  };
}

export function useProfileBySlug(slug: string) {
  const result = useLiveQuery<ProfileRow | null, { slug: string }>(
    api.profiles.getBySlug,
    { slug },
    { enabled: slug.trim().length > 0 }
  );
  return {
    ...result,
    data: result.data
      ? {
          ...result.data,
          id:
            typeof result.data.user_id === 'string' && result.data.user_id.length > 0
              ? result.data.user_id
              : result.data._id,
        }
      : undefined,
  };
}

export function useProfilesAll() {
  const result = useLiveQuery<ProfileRow[], Record<string, never>>(api.profiles.list, {});
  return {
    ...result,
    data: result.data?.map((entry) => {
      const resolvedId =
        typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
      return { ...entry, id: resolvedId };
    }),
  };
}

export function useCurrentProfile() {
  const current = useLiveQuery<ProfileRow | null, Record<string, never>>(api.profiles.current, {});
  const currentUserId = useLiveQuery<string | null, Record<string, never>>(
    api.profiles.currentUserId,
    {}
  );
  const bootstrap = useLiveMutation<Record<string, never>, ProfileRow>(
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
      data: {
        ...current.data,
        id:
          typeof current.data.user_id === 'string' && current.data.user_id.length > 0
            ? current.data.user_id
            : current.data._id,
      },
    };
  }

  if (bootstrap.data) {
    return {
      ...bootstrap,
      data: {
        ...bootstrap.data,
        id:
          typeof bootstrap.data.user_id === 'string' && bootstrap.data.user_id.length > 0
            ? bootstrap.data.user_id
            : bootstrap.data._id,
      },
      isLoading: bootstrap.isPending,
    };
  }

  return {
    ...current,
    data: undefined,
  };
}

export function useUpdateCurrentProfile() {
  const mutate = useLiveMutation<{ username: string; avatar_url: string }, ProfileRow>(
    api.profiles.updateCurrent
  );
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
            onSuccess: (entry) => {
              const resolvedId =
                typeof entry.user_id === 'string' && entry.user_id.length > 0
                  ? entry.user_id
                  : entry._id;
              options?.onSuccess?.({ ...entry, id: resolvedId }, variables);
            },
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
      const resolvedId =
        typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
      return { ...entry, id: resolvedId };
    },
  };
}

export type { ProfileUserEditInput };
