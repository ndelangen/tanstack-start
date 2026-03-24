import { v } from 'convex/values';
import { groupInputSchema } from '../src/app/groups/validation';

import { mutation, query } from './_generated/server';
import { requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';

export const getById = query({
  args: { id: v.id('groups') },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    return group;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('groups').take(500);
  },
});

export const listByCreator = query({
  args: { created_by: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('groups')
      .withIndex('by_created_by', (q) => q.eq('created_by', args.created_by))
      .take(500);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const parsed = groupInputSchema.safeParse({ name: args.name });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid group input');
    }
    const normalizedName = parsed.data.name;
    const existing = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', normalizedName))
      .unique();
    if (existing) throw new Error('Group name already exists');

    const now = nowIso();
    const _id = await ctx.db.insert('groups', {
      name: normalizedName,
      created_by: userId,
      created_at: now,
    });

    const row = await ctx.db.get(_id);
    if (!row) throw new Error('Failed to create group');
    return row;
  },
});

export const update = mutation({
  args: {
    id: v.id('groups'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const parsed = groupInputSchema.safeParse({ name: args.name });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid group input');
    }
    const normalizedName = parsed.data.name;
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    if (group.created_by !== userId) throw new Error('Not authorized');

    const nameOwner = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', normalizedName))
      .unique();
    if (nameOwner && nameOwner._id !== args.id) throw new Error('Group name already exists');

    await ctx.db.patch(group._id, { name: normalizedName });
    const updated = await ctx.db.get(group._id);
    if (!updated) throw new Error('Failed to update group');
    return updated;
  },
});

export const remove = mutation({
  args: { id: v.id('groups') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    if (group.created_by !== userId) throw new Error('Not authorized');
    await ctx.db.delete(args.id);
    return args.id;
  },
});
