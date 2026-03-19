import { z } from 'zod';

import { FactionSchema } from '@game/schema/faction';

/** Previous app-only row shape (still valid for existing rows). */
export const legacyFactionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  color: z.string(),
  icon: z.string(),
});

/** Stored JSON for `factions.data`: full game definition or legacy summary. */
export const schema = z.union([FactionSchema, legacyFactionDataSchema]);

export type FactionRowData = z.infer<typeof schema>;

export function isFullFactionData(data: FactionRowData): data is z.infer<typeof FactionSchema> {
  return FactionSchema.safeParse(data).success;
}
