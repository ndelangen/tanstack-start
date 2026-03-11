import { db } from './connect';

export async function list() {
  const base = () => db.from('group_members').select('*')
  return {
    approved: async (groupId: string) => base().filter('group_id', 'eq', groupId).filter('status', 'eq', 'approved'),
    pending: async (groupId: string) => base().filter('group_id', 'eq', groupId).filter('status', 'eq', 'pending'),
    rejected: async (groupId: string) => base().filter('group_id', 'eq', groupId).filter('status', 'eq', 'rejected'),
  }
}

export async function request(groupId: string) {
  const user = await db.auth.getUser();
  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db.from('group_members').insert({
    group_id: groupId,
    user_id: user.data.user?.id,
    status: 'pending',
    requested_at: new Date().toISOString(),
  })
}

export async function approve(groupId: string, userId: string) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  

  return db.from('group_members').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.data.user?.id,
  }).eq('group_id', groupId).eq('user_id', userId)
}

export async function reject(groupId: string, userId: string) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  

  return db.from('group_members').update({
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejected_by: user.data.user?.id,
  }).eq('group_id', groupId).eq('user_id', userId)
}

export async function remove(groupId: string, userId: string) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  

  return db.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
}

export async function add(groupId: string, userId: string) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  

  return db.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.data.user?.id,
  }).eq('group_id', groupId).eq('user_id', userId)
}