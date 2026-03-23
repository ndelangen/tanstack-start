import { v } from 'convex/values';

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
    return await ctx.db.query('groups').collect();
  },
});

export const listByCreator = query({
  args: { created_by: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('groups')
      .withIndex('by_created_by', (q) => q.eq('created_by', args.created_by))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const existing = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (existing) throw new Error('Group name already exists');

    const now = nowIso();
    const _id = await ctx.db.insert('groups', {
      name: args.name,
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
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    if (group.created_by !== userId) throw new Error('Not authorized');

    const nameOwner = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (nameOwner && nameOwner._id !== args.id) throw new Error('Group name already exists');

    await ctx.db.patch(group._id, { name: args.name });
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
