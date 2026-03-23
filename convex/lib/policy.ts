import { getAuthUserId } from '@convex-dev/auth/server';

import type { MutationCtx, QueryCtx } from '../types';

type AnyCtx = QueryCtx | MutationCtx;

export async function requireAuthUserId(ctx: AnyCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return String(userId);
}

export async function isActiveGroupMember(ctx: AnyCtx, groupId: string, userId: string) {
  const membership = await ctx.db
    .query('group_members')
    .withIndex('by_group_user', (q) => q.eq('group_id', groupId).eq('user_id', userId))
    .unique();
  return membership?.status === 'active';
}

export async function canAccessRuleset(
  ctx: AnyCtx,
  ruleset: {
    owner_id: string;
    group_id?: string | null;
    is_deleted?: boolean;
  },
  userId: string
) {
  if (ruleset.is_deleted) return false;
  if (ruleset.owner_id === userId) return true;
  if (!ruleset.group_id) return false;
  return await isActiveGroupMember(ctx, ruleset.group_id, userId);
}
