import { auth, db } from '@db/core';

export async function list() {
  const base = () => db.from('groups').select('*').filter('is_deleted', 'eq', false);
  return {
    all: async () => base(),
  };
}

export async function get(id: string) {
  return db.from('groups').select('*').eq('id', id).single();
}

export async function create(name: string) {
  const user = await auth.getUser();
  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db.from('groups').insert({
    created_by: user.data.user?.id,
    name,
  });
}

export async function update(id: string, name: string) {
  const user = await auth.getUser();

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db
    .from('groups')
    .update({
      name: name,
    })
    .eq('id', id);
}

export async function remove(_id: string) {
  throw new Error('Not implemented');
}
