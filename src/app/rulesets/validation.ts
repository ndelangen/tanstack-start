import { z } from 'zod';

import { alphanumericNameSchema } from '@app/validation/names';

export const rulesetNameSchema = alphanumericNameSchema('Ruleset name');

export const rulesetInputSchema = z.strictObject({
  name: rulesetNameSchema,
});

export type RulesetInput = z.infer<typeof rulesetInputSchema>;

/** Canonical ruleset semantic validation surface. */
export const rulesetValidationSchemas = {
  name: rulesetNameSchema,
  input: rulesetInputSchema,
} as const;
