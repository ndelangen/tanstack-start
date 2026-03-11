import { z } from 'zod';

export const schema = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  color: z.string(),
  icon: z.string(),
});
