import { z } from 'zod';

export const groupNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]+$/, 'Group name may only contain letters and numbers')
  .min(1, 'Group name is required');

export const groupInputSchema = z.strictObject({
  name: groupNameSchema,
});

export type GroupInput = z.infer<typeof groupInputSchema>;
