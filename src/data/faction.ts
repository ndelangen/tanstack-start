import { z } from "zod"

export const factionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  color: z.string(),
  icon: z.string(),
})