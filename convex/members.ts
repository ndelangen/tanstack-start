import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

import { isActiveGroupMember, requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';
import type { MutationCtx, QueryCtx } from './types';

const statusValidator = v.union(v.literal('pending'), v.literal('active'), v.literal('removed'));

async function getMembership(ctx: QueryCtx | MutationCtx, groupId: string, userId: string) {
  return await ctx.db
    .query('group_members')
    .withIndex('by_group_user', (q) => q.eq('group_id', groupId).eq('user_id', userId))
    .unique();
}

export const listByUserActiveWithGroups = queryGeneric({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('group_members')
      .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
      .collect();
    const active = rows.filter((row) => row.status === 'active');
    const groups = await Promise.all(
      active.map((row) =>
        ctx.db
          .query('groups')
          .withIndex('by_entity_id', (q) => q.eq('id', row.group_id))
          .unique()
      )
    );
    return active.map((row, index) => {
      const group = groups[index];
      return {
        ...row,
        groups: group ? { id: group.id, name: group.name } : null,
      };
    });
  },
});

export const listByGroup = queryGeneric({
  args: { group_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('group_members')
      .withIndex('by_group', (q) => q.eq('group_id', args.group_id))
      .collect();
  },
});

export const listByGroupAndStatus = queryGeneric({
  args: { group_id: v.string(), status: statusValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('group_members')
      .withIndex('by_group_status', (q) =>
        q.eq('group_id', args.group_id).eq('status', args.status)
      )
      .collect();
  },
});

export const get = queryGeneric({
  args: { group_id: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    const row = await getMembership(ctx, args.group_id, args.user_id);
    if (!row) throw new Error('Group member not found');
    return row;
  },
});

export const request = mutationGeneric({
  args: { group_id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const group = await ctx.db
      .query('groups')
      .withIndex('by_entity_id', (q) => q.eq('id', args.group_id))
      .unique();
    if (!group) throw new Error('Group not found');

    const existing = await getMembership(ctx, args.group_id, userId);
    if (existing) {
      if (existing.status === 'pending' || existing.status === 'active') return existing;
      await ctx.db.patch(existing._id, {
        status: 'pending',
        approved_at: null,
        approved_by: null,
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) throw new Error('Failed to update membership');
      return updated;
    }

    const _id = await ctx.db.insert('group_members', {
      group_id: args.group_id,
      user_id: userId,
      status: 'pending',
      requested_at: nowIso(),
      approved_at: null,
      approved_by: null,
    });
    const created = await ctx.db.get(_id);
    if (!created) throw new Error('Failed to request group membership');
    return created;
  },
});

export const approve = mutationGeneric({
  args: { group_id: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    const actorId = await requireAuthUserId(ctx);
    const canManage = await isActiveGroupMember(ctx, args.group_id, actorId);
    if (!canManage) throw new Error('Not authorized');

    const row = await getMembership(ctx, args.group_id, args.user_id);
    if (!row) throw new Error('Failed to approve group member');
    await ctx.db.patch(row._id, {
      status: 'active',
      approved_by: actorId,
      approved_at: nowIso(),
    });
    const updated = await ctx.db.get(row._id);
    if (!updated) throw new Error('Failed to approve group member');
    return updated;
  },
});

export const reject = mutationGeneric({
  args: { group_id: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    const actorId = await requireAuthUserId(ctx);
    const canManage = await isActiveGroupMember(ctx, args.group_id, actorId);
    if (!canManage) throw new Error('Not authorized');

    const row = await getMembership(ctx, args.group_id, args.user_id);
    if (!row) throw new Error('Failed to reject group member');
    await ctx.db.patch(row._id, {
      status: 'removed',
      approved_by: null,
      approved_at: null,
    });
    const updated = await ctx.db.get(row._id);
    if (!updated) throw new Error('Failed to reject group member');
    return updated;
  },
});

export const remove = mutationGeneric({
  args: { group_id: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    const actorId = await requireAuthUserId(ctx);
    const canManage = await isActiveGroupMember(ctx, args.group_id, actorId);
    if (!canManage) throw new Error('Not authorized');

    const row = await getMembership(ctx, args.group_id, args.user_id);
    if (!row) throw new Error('Failed to remove group member');
    await ctx.db.patch(row._id, {
      status: 'removed',
      approved_by: null,
      approved_at: null,
    });
    return { groupId: args.group_id, userId: args.user_id };
  },
});

export const add = mutationGeneric({
  args: { group_id: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    const actorId = await requireAuthUserId(ctx);
    const canManage = await isActiveGroupMember(ctx, args.group_id, actorId);
    if (!canManage) throw new Error('Not authorized');

    const existing = await getMembership(ctx, args.group_id, args.user_id);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'active',
        approved_by: actorId,
        approved_at: nowIso(),
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) throw new Error('Failed to add group member');
      return updated;
    }

    const _id = await ctx.db.insert('group_members', {
      group_id: args.group_id,
      user_id: args.user_id,
      status: 'active',
      requested_at: nowIso(),
      approved_by: actorId,
      approved_at: nowIso(),
    });
    const created = await ctx.db.get(_id);
    if (!created) throw new Error('Failed to add group member');
    return created;
  },
});
