import { v } from 'convex/values';

import { FactionInputSchema } from '../src/game/schema/faction';
import { mutation, query } from './_generated/server';
import { isActiveGroupMember, requireAuthUserId } from './lib/policy';
import { nowIso, slugify } from './lib/utils';

function normalizeFactionData(input: unknown) {
  const parsed = FactionInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issuePath = firstIssue?.path.join('.') ?? 'data';
    const issueMessage = firstIssue?.message ?? 'Invalid faction data';
    throw new Error(`Invalid faction data at ${issuePath}: ${issueMessage}`);
  }
  return {
    ...parsed.data,
    slug: slugify(parsed.data.name),
  };
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
    return await ctx.db
      .query('factions')
      .withIndex('by_deleted', (q) => q.eq('is_deleted', false))
      .take(500);
  },
});

export const listByOwner = query({
  args: { owner_id: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('factions')
      .withIndex('by_owner_deleted', (q) => q.eq('owner_id', args.owner_id).eq('is_deleted', false))
      .take(500);
  },
});

export const listByGroup = query({
  args: { group_id: v.id('groups') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('factions')
      .withIndex('by_group_deleted', (q) => q.eq('group_id', args.group_id).eq('is_deleted', false))
      .take(500);
  },
});

export const create = mutation({
  args: {
    data: v.any(),
    group_id: v.union(v.id('groups'), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    if (args.group_id) {
      const canUseGroup = await isActiveGroupMember(ctx, args.group_id, userId);
      if (!canUseGroup) throw new Error('Not authorized for group');
    }

    const data = normalizeFactionData(args.data);
    const slug = data.slug;
    const existing = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing && !existing.is_deleted) {
      throw new Error(`Faction with id ${slug} already exists`);
    }

    const now = nowIso();
    const _id = await ctx.db.insert('factions', {
      owner_id: userId,
      data,
      slug,
      group_id: args.group_id,
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
    id: v.id('factions'),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.is_deleted) throw new Error(`Faction with id ${args.id} not found`);
    const isOwner = row.owner_id === userId;
    const isGroupEditor =
      row.group_id == null ? false : await isActiveGroupMember(ctx, row.group_id, userId);
    if (!isOwner && !isGroupEditor) throw new Error('Not authorized');

    const data = normalizeFactionData(args.data);
    const slug = data.slug;
    const slugOwner = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (slugOwner && slugOwner._id !== args.id && !slugOwner.is_deleted) {
      throw new Error(`Faction with id ${slug} already exists`);
    }

    await ctx.db.patch(args.id, {
      data,
      slug,
      updated_at: nowIso(),
    });
    const updated = await ctx.db.get(args.id);
    if (!updated) throw new Error('Failed to update faction');
    return updated;
  },
});

export const setGroup = mutation({
  args: {
    id: v.id('factions'),
    group_id: v.union(v.id('groups'), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.is_deleted) throw new Error(`Faction with id ${args.id} not found`);
    if (row.owner_id !== userId) throw new Error('Not authorized');
    if (args.group_id) {
      const canUseGroup = await isActiveGroupMember(ctx, args.group_id, userId);
      if (!canUseGroup) throw new Error('Not authorized for group');
    }

    await ctx.db.patch(args.id, {
      group_id: args.group_id,
      updated_at: nowIso(),
    });
    const updated = await ctx.db.get(args.id);
    if (!updated) throw new Error('Failed to update faction group');
    return updated;
  },
});

export const softDelete = mutation({
  args: { id: v.id('factions') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error(`Faction with id ${args.id} not found`);
    if (row.owner_id !== userId) throw new Error('Not authorized');

    await ctx.db.patch(args.id, {
      is_deleted: true,
      updated_at: nowIso(),
    });
  },
});

export const getFullBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!row || row.is_deleted) throw new Error(`Faction with slug ${args.slug} not found`);
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('user_id', row.owner_id))
      .unique();
    if (!profile) throw new Error(`Profile with user id ${row.owner_id} not found`);
    const group = row.group_id ? await ctx.db.get('groups', row.group_id) : null;

    return {
      ...row,
      data: FactionInputSchema.parse(row.data),
      owner: profile,
      group: group,
    };
  },
});

export const getEditorPageBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const row = await ctx.db
      .query('factions')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!row || row.is_deleted) throw new Error(`Faction with slug ${args.slug} not found`);

    const ownerProfile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('user_id', row.owner_id))
      .unique();
    if (!ownerProfile) throw new Error(`Profile with user id ${row.owner_id} not found`);

    const group = row.group_id ? await ctx.db.get('groups', row.group_id) : null;

    const memberships = await ctx.db
      .query('group_members')
      .withIndex('by_user_status', (q) => q.eq('user_id', userId).eq('status', 'active'))
      .take(500);

    const groups = await ctx.db.query('groups').take(500);

    return {
      faction: {
        ...row,
        data: FactionInputSchema.parse(row.data),
      },
      owner: ownerProfile,
      group,
      memberships,
      groups,
    };
  },
});

export const getCreatePageContext = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .unique();

    const groups = await ctx.db
      .query('groups')
      .withIndex('by_created_by', (q) => q.eq('created_by', userId))
      .take(500);

    const memberships = await ctx.db
      .query('group_members')
      .withIndex('by_user_status', (q) => q.eq('user_id', userId).eq('status', 'active'))
      .take(500);

    return {
      ownerProfile: profile,
      groups,
      memberships,
    };
  },
});
