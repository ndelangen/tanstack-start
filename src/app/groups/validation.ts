import { z } from 'zod';

import { alphanumericNameSchema } from '@app/validation/names';

export const groupNameSchema = alphanumericNameSchema('Group name');

export const groupInputSchema = z.strictObject({
  name: groupNameSchema,
});

export type GroupInput = z.infer<typeof groupInputSchema>;

/** Canonical group semantic validation surface. */
export const groupValidationSchemas = {
  name: groupNameSchema,
  input: groupInputSchema,
} as const;
