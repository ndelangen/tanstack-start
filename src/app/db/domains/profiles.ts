import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';
import { type ProfileUserEditInput, profileUserEditFormSchema } from '@app/profile/validation';

/* Types */

export type ProfileEntry = Tables<'profiles'>;

export type ProfileInsert = TablesInsert<'profiles'>;

export type ProfileUpdate = TablesUpdate<'profiles'>;

/* Query Keys */

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: object) => [...profileKeys.lists(), filters] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  detailBySlug: (slug: string) => [...profileKeys.all, 'detailBySlug', slug] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};

/* Queries */

export function profileDetailQueryOptions(id: NonNullable<ProfileEntry['id']>) {
  return queryOptions({
    queryKey: profileKeys.detail(id),
    queryFn: async () => {
      const { data: entry, error } = await db.from('profiles').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error(`Profile with id ${id} not found`);
      }

      return entry;
    },
  });
}

export function profileBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: profileKeys.detailBySlug(slug),
    queryFn: async () => {
      const { data: entry, error } = await db
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error(`Profile with slug ${slug} not found`);
      }

      return entry;
    },
  });
}

export function profilesListQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.list({ type: 'all' }),
    queryFn: async () => {
      const { data: entries, error } = await db.from('profiles').select('*');

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

export function currentProfileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      const user = await auth.getUser();
      if (!user.data.user?.id) {
        return null;
      }

      const { data: entry, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', user.data.user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error('Profile not found');
      }

      return entry;
    },
  });
}

export function useProfile(id: NonNullable<ProfileEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    ...profileDetailQueryOptions(id),
    initialData: () =>
      qc.getQueryData<ProfileEntry[]>(profileKeys.list({ type: 'all' }))?.find((d) => d.id === id),
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

/* Mutations */

export function useUpdateCurrentProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ input }: { input: ProfileUserEditInput }) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const parsed = profileUserEditFormSchema.safeParse(input);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(' ');
        throw new Error(msg || 'Invalid profile input');
      }

      const { data: entry, error } = await db
        .from('profiles')
        .update({
          username: parsed.data.username,
          avatar_url: parsed.data.avatar_url,
        } satisfies ProfileUpdate)
        .eq('id', user.data.user.id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to update profile');

      return entry;
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
      qc.setQueryData(profileKeys.detail(entry.id), entry);
      qc.setQueryData(profileKeys.detailBySlug(entry.slug), entry);
      qc.setQueryData(profileKeys.current(), entry);
      qc.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}

export type { ProfileUserEditInput };
