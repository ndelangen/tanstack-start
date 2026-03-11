import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auth, db, type Tables, type TablesInsert, type TablesUpdate } from '@db/core';

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
  current: () => [...profileKeys.all, 'current'] as const,
};

/* Queries */

export function useProfile(id: NonNullable<ProfileEntry['id']>) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: async () => {
      const { data: entry, error } = await db.from('profiles').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      if (!entry) {
        throw new Error(`Profile with id ${id} not found`);
      }

      return entry as ProfileEntry;
    },
    initialData: () =>
      qc.getQueryData<ProfileEntry[]>(profileKeys.list({ type: 'all' }))?.find((d) => d.id === id),
  });
}

export function useProfilesAll() {
  return useQuery({
    queryKey: profileKeys.list({ type: 'all' }),
    queryFn: async () => {
      const { data: entries, error } = await db.from('profiles').select('*');

      if (error) {
        throw error;
      }

      if (!entries) {
        return [];
      }

      return entries as ProfileEntry[];
    },
  });
}

export function useCurrentProfile() {
  return useQuery({
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

      return entry as ProfileEntry;
    },
  });
}

/* Mutations */

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      const user = await auth.getUser();
      if (!user.data.user?.id) throw new Error('Not authenticated');

      const { data: entry, error } = await db
        .from('profiles')
        .update(update)
        .eq('id', user.data.user.id)
        .select()
        .single();

      if (error) throw error;
      if (!entry) throw new Error('Failed to update profile');

      return entry as ProfileEntry;
    },

    onSuccess: (entry) => {
      qc.setQueryData(profileKeys.detail(entry.id), entry);
      qc.setQueryData(profileKeys.current(), entry);
      qc.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}
