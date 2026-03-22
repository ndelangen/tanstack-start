import { z } from 'zod';

/** Lowercase [a-z0-9] only; matches DB slugify base (no numeric uniqueness suffix). */
export function profileSlugBaseFromName(name: string): string {
  const raw = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
  return raw || 'user';
}

function isAllCapsShouting(s: string): boolean {
  const letters = s.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;
  return letters === letters.toUpperCase();
}

export const profileDisplayNameEditSchema = z
  .string()
  .trim()
  .min(5, 'Display name must be at least 5 characters')
  .max(30, 'Display name must be at most 30 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Display name may only contain letters and numbers')
  .refine((s) => !isAllCapsShouting(s), {
    message: 'Display name cannot be all capitals',
  });

/** Empty clears the avatar (null in DB). */
export const profileUserEditFormSchema = z.object({
  username: profileDisplayNameEditSchema,
  avatar_url: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val === '') return;
      try {
        const u = new URL(val);
        if (u.protocol !== 'https:') {
          ctx.addIssue({
            code: 'custom',
            message: 'Avatar must use https://',
          });
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Avatar must be a full https:// URL',
        });
      }
    })
    .transform((v) => (v === '' ? null : v)),
});

export type ProfileUserEditInput = z.infer<typeof profileUserEditFormSchema>;
