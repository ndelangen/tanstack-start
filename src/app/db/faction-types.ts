import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from './types'
import { factionDataSchema } from '../../data/faction'

// Infer TypeScript type from Zod schema
export type FactionData = z.infer<typeof factionDataSchema>

// Base faction row type from database
type FactionRowBase = Tables<'factions'>

// Typed faction row with validated data field
export type FactionRow = Omit<FactionRowBase, 'data'> & {
  data: FactionData
}

// Base faction insert type from database
type FactionInsertBase = TablesInsert<'factions'>

// Typed faction insert with validated data field
export type FactionInsert = Omit<FactionInsertBase, 'data'> & {
  data: FactionData
}

// Base faction update type from database
type FactionUpdateBase = TablesUpdate<'factions'>

// Typed faction update with validated data field
export type FactionUpdate = Omit<FactionUpdateBase, 'data'> & {
  data?: FactionData
}
