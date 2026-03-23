import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

import { isActiveGroupMember, requireAuthUserId } from './lib/policy';
import { ensureObject, nowIso, slugify } from './lib/utils';

function factionSlug(data: unknown) {
  const obj = ensureObject(data);
  const id = obj.id;
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Faction data.id is required');
  }
  return slugify(id);
}

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!row || row.is_deleted) {
      throw new Error(`Faction with id ${args.slug} not found`);
    }
    return row;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('factions').collect();
    return rows.filter((row) => !row.is_deleted);
  },
});

export const listByOwner = query({
  args: { owner_id: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('factions')
      .withIndex('by_owner_id', (q) => q.eq('owner_id', args.owner_id))
      .collect();
    return rows.filter((row) => !row.is_deleted);
  },
});

export const listByGroup = query({
  args: { group_id: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('factions')
      .withIndex('by_group_id', (q) => q.eq('group_id', args.group_id))
      .collect();
    return rows.filter((row) => !row.is_deleted);
  },
});

export const create = mutation({
  args: {
    data: v.any(),
    group_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    if (args.group_id) {
      const canUseGroup = await isActiveGroupMember(ctx, args.group_id, userId);
      if (!canUseGroup) throw new Error('Not authorized for group');
    }

    const slug = factionSlug(args.data);
    const existing = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing && !existing.is_deleted) {
      throw new Error(`Faction with id ${slug} already exists`);
    }

    const now = nowIso();
    const id = crypto.randomUUID();
    const _id = await ctx.db.insert('factions', {
      id,
      owner_id: userId,
      data: args.data,
      slug,
      group_id: args.group_id ?? null,
      created_at: now,
      updated_at: now,
      is_deleted: false,
    });
    const row = await ctx.db.get(_id);
    if (!row) throw new Error('Failed to create faction');
    return row;
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const row = await ctx.db
      .query('factions')
      .withIndex('by_entity_id', (q) => q.eq('id', args.id))
      .unique();
    if (!row || row.is_deleted) throw new Error(`Faction with id ${args.id} not found`);
    if (row.owner_id !== userId) throw new Error('Not authorized');

    const slug = factionSlug(args.data);
    const slugOwner = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (slugOwner && slugOwner.id !== args.id && !slugOwner.is_deleted) {
      throw new Error(`Faction with id ${slug} already exists`);
    }

    await ctx.db.patch(row._id, {
      data: args.data,
      slug,
      updated_at: nowIso(),
    });
    const updated = await ctx.db.get(row._id);
    if (!updated) throw new Error('Failed to update faction');
    return updated;
  },
});

export const softDelete = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const row = await ctx.db
      .query('factions')
      .withIndex('by_entity_id', (q) => q.eq('id', args.id))
      .unique();
    if (!row) throw new Error(`Faction with id ${args.id} not found`);
    if (row.owner_id !== userId) throw new Error('Not authorized');

    await ctx.db.patch(row._id, {
      is_deleted: true,
      updated_at: nowIso(),
    });
  },
});
