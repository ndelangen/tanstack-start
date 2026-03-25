import { v } from 'convex/values';

import { groupInputSchema } from '../src/app/groups/validation';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuthUserId } from './lib/policy';
import { nowIso, slugify } from './lib/utils';

async function resolveUniqueGroupSlug(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<'groups'>
) {
  const baseSlug = slugify(name) || 'group';
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await ctx.db
      .query('groups')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (!existing || (excludeId && existing._id === excludeId)) {
      return slug;
    }
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export const getById = query({
  args: { id: v.id('groups') },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error(`Group with id ${args.id} not found`);
    return group;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query('groups')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!group) throw new Error(`Group with slug ${args.slug} not found`);
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
    const slug = await resolveUniqueGroupSlug(ctx, normalizedName);
    const _id = await ctx.db.insert('groups', {
      name: normalizedName,
      slug,
      created_by: userId,
      created_at: now,
    });
    await ctx.db.insert('group_members', {
      group_id: _id,
      user_id: userId,
      status: 'active',
      requested_at: now,
      approved_at: now,
      approved_by: userId,
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

    const slug = await resolveUniqueGroupSlug(ctx, normalizedName, args.id);
    await ctx.db.patch(group._id, { name: normalizedName, slug });
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

export const backfillMissingSlugs = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 200), 500));
    const rows = await ctx.db.query('groups').take(500);
    let updated = 0;

    for (const row of rows) {
      const hasSlug =
        typeof (row as { slug?: unknown }).slug === 'string' &&
        ((row as { slug?: string }).slug?.trim().length ?? 0) > 0;
      if (hasSlug || updated >= limit) {
        continue;
      }
      const slug = await resolveUniqueGroupSlug(ctx, row.name, row._id);
      await ctx.db.patch(row._id, { slug });
      updated += 1;
    }

    const remainingInBatch = rows.some((row) => {
      const hasSlug =
        typeof (row as { slug?: unknown }).slug === 'string' &&
        ((row as { slug?: string }).slug?.trim().length ?? 0) > 0;
      return !hasSlug;
    });

    return { scanned: rows.length, updated, remainingInBatch };
  },
});
