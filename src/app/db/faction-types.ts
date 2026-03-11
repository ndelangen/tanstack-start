import { z } from 'zod'
import { schema } from '@data/factions';

import type { Tables, TablesInsert, TablesUpdate } from './types'

// Infer TypeScript type from Zod schema
export type Faction = z.infer<typeof schema>

// Typed faction row with validated data field
export type FactionEntry = Omit<Tables<'factions'>, 'data'> & {
  data: Faction
}

// Typed faction insert with validated data field
export type FactionInsert = Omit<TablesInsert<'factions'>, 'data'> & {
  data: Faction
}

// Typed faction update with validated data field
export type FactionUpdate = Omit<TablesUpdate<'factions'>, 'data'> & {
  data?: Faction
}

