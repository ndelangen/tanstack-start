import { useEffect, useRef } from 'react';

import { db } from '@db/core';
import { useLiveMutation, useLiveQuery } from '@app/db/core/live';
import { type ProfileUserEditInput, profileUserEditFormSchema } from '@app/profile/validation';

import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type ProfileRow = Doc<'profiles'>;
export type ProfileEntry = ProfileRow & { id: ProfileRow['user_id'] | ProfileRow['_id'] };

function toProfileEntry(entry: ProfileRow): ProfileEntry {
  const resolvedId =
    typeof entry.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : entry._id;
  return { ...entry, id: resolvedId };
}

export async function loadProfileBySlug(slug: string): Promise<ProfileEntry> {
  const entry = await db.query<ProfileRow>(api.profiles.getBySlug, { slug });
  return toProfileEntry(entry);
}

export async function loadProfilesAll(): Promise<ProfileEntry[]> {
  const entries = await db.query<ProfileRow[]>(api.profiles.list, {});
  return entries.map(toProfileEntry);
}

export async function loadCurrentUserId(): Promise<string | null> {
  return await db.query<string | null>(api.profiles.currentUserId, {});
}

export async function loadCurrentProfile(): Promise<ProfileEntry | null> {
  const currentRaw = await db.query<ProfileRow | null>(api.profiles.current, {});
  const current = currentRaw ? toProfileEntry(currentRaw) : null;
  if (current) {
    const needsBackfill = current.slug === 'user' || !current.username || !current.avatar_url;
    if (needsBackfill) {
      const entry = await db.mutation<ProfileRow>(api.profiles.bootstrapCurrent, {});
      return toProfileEntry(entry);
    }
    return current;
  }

  const userId = await loadCurrentUserId();
  if (!userId) {
    return null;
  }

  const entry = await db.mutation<ProfileRow>(api.profiles.bootstrapCurrent, {});
  return toProfileEntry(entry);
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

export function useProfileBySlug(
  slug: string,
  options?: { initialData?: ProfileEntry | null; enabled?: boolean }
) {
  const result = useLiveQuery<ProfileRow | null, { slug: string }>(
    api.profiles.getBySlug,
    { slug },
    {
      enabled: options?.enabled ?? slug.trim().length > 0,
      initialData: () => options?.initialData ?? undefined,
    }
  );
  return {
    ...result,
    data: result.data ? toProfileEntry(result.data) : undefined,
  };
}

export function useProfilesAll(options?: { initialData?: ProfileEntry[] }) {
  const result = useLiveQuery<ProfileRow[], Record<string, never>>(api.profiles.list, {}, {
    initialData: () => options?.initialData ?? undefined,
  });
  return {
    ...result,
    data: result.data?.map(toProfileEntry),
  };
}

export function useCurrentProfile(options?: {
  initialCurrent?: ProfileEntry | null;
  initialCurrentUserId?: string | null;
}) {
  const current = useLiveQuery<ProfileRow | null, Record<string, never>>(api.profiles.current, {}, {
    initialData: () => options?.initialCurrent ?? undefined,
  });
  const currentUserId = useLiveQuery<string | null, Record<string, never>>(
    api.profiles.currentUserId,
    {},
    { initialData: () => options?.initialCurrentUserId ?? undefined }
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
      data: toProfileEntry(current.data),
    };
  }

  if (bootstrap.data) {
    return {
      ...bootstrap,
      data: toProfileEntry(bootstrap.data),
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
