import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from './types'
import { schema } from '../../data/factions'

// Infer TypeScript type from Zod schema
export type Faction = z.infer<typeof schema>

// Base faction row type from database
type FactionRowBase = Tables<'factions'>

// Typed faction row with validated data field
export type FactionEntry = Omit<FactionRowBase, 'data'> & {
  data: Faction
}

// Base faction insert type from database
type FactionInsertBase = TablesInsert<'factions'>

// Typed faction insert with validated data field
export type FactionInsert = Omit<FactionInsertBase, 'data'> & {
  data: Faction
}

// Base faction update type from database
type FactionUpdateBase = TablesUpdate<'factions'>

// Typed faction update with validated data field
export type FactionUpdate = Omit<FactionUpdateBase, 'data'> & {
  data?: Faction
}

