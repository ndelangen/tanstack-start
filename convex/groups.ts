import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

import { requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';

export const getById = queryGeneric({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query('groups')
      .withIndex('by_entity_id', (q) => q.eq('id', args.id))
      .unique();
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    return group;
  },
});

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('groups').collect();
  },
});

export const listByCreator = queryGeneric({
  args: { created_by: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('groups')
      .withIndex('by_created_by', (q) => q.eq('created_by', args.created_by))
      .collect();
  },
});

export const create = mutationGeneric({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const existing = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (existing) throw new Error('Group name already exists');

    const now = nowIso();
    const id = crypto.randomUUID();
    const _id = await ctx.db.insert('groups', {
      id,
      name: args.name,
      created_by: userId,
      created_at: now,
    });

    const row = await ctx.db.get(_id);
    if (!row) throw new Error('Failed to create group');
    return row;
  },
});

export const update = mutationGeneric({
  args: {
    id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const group = await ctx.db
      .query('groups')
      .withIndex('by_entity_id', (q) => q.eq('id', args.id))
      .unique();
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    if (group.created_by !== userId) throw new Error('Not authorized');

    const nameOwner = await ctx.db
      .query('groups')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (nameOwner && nameOwner.id !== args.id) throw new Error('Group name already exists');

    await ctx.db.patch(group._id, { name: args.name });
    const updated = await ctx.db.get(group._id);
    if (!updated) throw new Error('Failed to update group');
    return updated;
  },
});

export const remove = mutationGeneric({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const group = await ctx.db
      .query('groups')
      .withIndex('by_entity_id', (q) => q.eq('id', args.id))
      .unique();
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    if (group.created_by !== userId) throw new Error('Not authorized');
    await ctx.db.delete(group._id);
    return args.id;
  },
});
