import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { type ProfileUserEditInput, profileUserEditFormSchema } from '@app/profile/validation';

export type ProfileEntry = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

function withProfileId(entry: Omit<ProfileEntry, 'id'>): ProfileEntry {
  const legacyId = (entry as { id?: unknown }).id;
  const resolvedId =
    typeof entry.user_id === 'string' && entry.user_id.length > 0
      ? entry.user_id
      : typeof legacyId === 'string' && legacyId.length > 0
        ? legacyId
        : entry._id;
  return { ...entry, id: resolvedId };
}

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: object) => [...profileKeys.lists(), filters] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  detailBySlug: (slug: string) => [...profileKeys.all, 'detailBySlug', slug] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};

export function profileDetailQueryOptions(id: NonNullable<ProfileEntry['_id']>) {
  return queryOptions({
    queryKey: profileKeys.detail(id),
    queryFn: async () =>
      withProfileId(await db.query<Omit<ProfileEntry, 'id'>>('profiles:getById', { id })),
  });
}

export function profileBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: profileKeys.detailBySlug(slug),
    queryFn: async () =>
      withProfileId(await db.query<Omit<ProfileEntry, 'id'>>('profiles:getBySlug', { slug })),
  });
}

export function profilesListQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.list({ type: 'all' }),
    queryFn: async () =>
      (await db.query<Omit<ProfileEntry, 'id'>[]>('profiles:list', {})).map(withProfileId),
  });
}

export function currentProfileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      const currentRaw = await db.query<Omit<ProfileEntry, 'id'> | null>('profiles:current', {});
      const current = currentRaw ? withProfileId(currentRaw) : null;
      if (current) {
        const needsBackfill = current.slug === 'user' || !current.username || !current.avatar_url;
        if (needsBackfill) {
          return withProfileId(
            await db.mutation<Omit<ProfileEntry, 'id'>>('profiles:bootstrapCurrent', {})
          );
        }
        return current;
      }

      const userId = await db.query<string | null>('profiles:currentUserId', {});
      if (!userId) {
        return null;
      }

      return withProfileId(await db.mutation<Omit<ProfileEntry, 'id'>>('profiles:bootstrapCurrent', {}));
    },
  });
}

export function useProfile(id: NonNullable<ProfileEntry['_id']>) {
  const qc = useQueryClient();

  return useQuery({
    ...profileDetailQueryOptions(id),
    initialData: () =>
      qc
        .getQueryData<ProfileEntry[]>(profileKeys.list({ type: 'all' }))
        ?.find((d) => d._id === id),
  });
}

export function useProfileBySlug(slug: string) {
  const qc = useQueryClient();

  return useQuery({
    ...profileBySlugQueryOptions(slug),
    initialData: () =>
      qc
        .getQueryData<ProfileEntry[]>(profileKeys.list({ type: 'all' }))
        ?.find((d) => d.slug === slug),
  });
}

export function useProfilesAll() {
  return useQuery(profilesListQueryOptions());
}

export function useCurrentProfile() {
  return useQuery(currentProfileQueryOptions());
}

export function useUpdateCurrentProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input }: { input: ProfileUserEditInput }) => {
      const parsed = profileUserEditFormSchema.safeParse(input);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(' ');
        throw new Error(msg || 'Invalid profile input');
      }
      return withProfileId(
        await db.mutation<Omit<ProfileEntry, 'id'>>('profiles:updateCurrent', {
          username: parsed.data.username,
          avatar_url: parsed.data.avatar_url,
        })
      );
    },

    onMutate: async () => {
      const previous = qc.getQueryData<ProfileEntry>(profileKeys.current());
      return { previous };
    },

    onSuccess: (entry, _vars, context) => {
      const prev = context?.previous;
      if (prev?.slug && prev.slug !== entry.slug) {
        qc.removeQueries({ queryKey: profileKeys.detailBySlug(prev.slug) });
      }
      qc.setQueryData(profileKeys.detail(entry._id), entry);
      qc.setQueryData(profileKeys.detailBySlug(entry.slug), entry);
      qc.setQueryData(profileKeys.current(), entry);
      qc.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}

export type { ProfileUserEditInput };
