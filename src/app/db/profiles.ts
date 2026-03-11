import { db } from './connect';
import type { TablesInsert } from './types';

export async function list() {
   return db.from('profiles').select('*')
  
}

export async function get() {
  const user = await db.auth.getUser();
  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db.from('profiles').select('*').eq('id', user.data.user?.id).single()
}

export async function update(update: TablesInsert<'profiles'>) {
  const user = await db.auth.getUser();
  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db.from('profiles').update(update).eq('id', user.data.user?.id)
}
