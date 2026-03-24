import { z } from 'zod';

export const rulesetNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]+$/, 'Ruleset name may only contain letters and numbers')
  .min(1, 'Ruleset name is required');

export const rulesetInputSchema = z.strictObject({
  name: rulesetNameSchema,
});

export type RulesetInput = z.infer<typeof rulesetInputSchema>;
