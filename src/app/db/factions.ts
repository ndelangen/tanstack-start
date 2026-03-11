import { db } from './connect';
import type { Faction, FactionEntry } from './faction-types';
import { schema } from 'src/data/factions';

export async function list() {
  const base = () => db.from('factions').select('*').filter('is_deleted', 'eq', false)
  return {
    all: async () => {
      const { data, error } = await base()
      if (error) throw error
      if (!data) return []
      // Validate data field for each faction
      return data.map((faction) => ({
        ...faction,
        data: schema.parse(faction.data),
      })) as FactionEntry[]
    },
    byOwner: async (ownerId: string) => {
      const { data, error } = await base().filter('owner_id', 'eq', ownerId)
      if (error) throw error
      if (!data) return []
      return data.map((faction) => ({
        ...faction,
        data: schema.parse(faction.data),
      })) as FactionEntry[]
    },
    byGroup: async (groupId: string) => {
      const { data, error } = await base().filter('group_id', 'eq', groupId)
      if (error) throw error
      if (!data) return []
      return data.map((faction) => ({
        ...faction,
        data: schema.parse(faction.data),
      })) as FactionEntry[]
    },
  }
}

export async function get(id: string) {
  const { data, error } = await db.from('factions').select('*').eq('id', id).single()
  if (error) throw error
  if (!data) throw new Error(`Faction with id ${id} not found`)
  
  // Validate data field
  return {
    ...data,
    data: schema.parse(data.data),
  } as FactionEntry
}

export async function create(factionData: Faction, groupId: string | null = null) {
  const user = await db.auth.getUser();
  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  // Validate data before sending to DB
  const validatedData = schema.parse(factionData)

  return db.from('factions').insert({
    owner_id: user.data.user?.id,
    data: validatedData,
    group_id: groupId,
  })
}

export async function update(id: string, factionData: Faction, groupId: string | null = null) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  
  // Validate data before sending to DB
  const validatedData = schema.parse(factionData)

  return db.from('factions').update({
    data: validatedData,
    owner_id: user.data.user?.id,
    group_id: groupId,
  }).eq('id', id)
}

export async function remove(id: string) {
  const user = await db.auth.getUser()

  if (!user.data.user?.id) {
    throw new Error('User not authenticated');
  }

  return db.from('factions').update({ is_deleted: true }).eq('id', id)
}