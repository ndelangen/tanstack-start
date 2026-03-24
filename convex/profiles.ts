import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { type MutationCtx, mutation, query } from './_generated/server';
import { requireAuthUserId } from './lib/policy';
import { nowIso, slugify } from './lib/utils';

async function createProfileIfMissing(ctx: MutationCtx, userId: Id<'users'>) {
  const identity = await ctx.auth.getUserIdentity();
  const authUserId = await getAuthUserId(ctx);
  const authUser = authUserId ? await ctx.db.get(authUserId) : null;
  const identityName =
    typeof identity?.name === 'string' && identity.name.length > 0 ? identity.name : null;
  const identityPictureUrl =
    typeof (identity as { pictureUrl?: unknown } | null)?.pictureUrl === 'string' &&
    ((identity as { pictureUrl?: string } | null)?.pictureUrl?.length ?? 0) > 0
      ? ((identity as { pictureUrl?: string } | null)?.pictureUrl ?? null)
      : null;
  const authUserName =
    authUser && typeof (authUser as { name?: unknown }).name === 'string'
      ? ((authUser as { name?: string }).name ?? null)
      : null;
  const authUserImage =
    authUser && typeof (authUser as { image?: unknown }).image === 'string'
      ? ((authUser as { image?: string }).image ?? null)
      : null;

  const existing = await ctx.db
    .query('profiles')
    .withIndex('by_user_id', (q) => q.eq('user_id', userId))
    .unique();
  if (existing) {
    const fillUsername = existing.username ?? identityName ?? authUserName;
    const fillAvatar = existing.avatar_url ?? identityPictureUrl ?? authUserImage;
    let nextSlug = existing.slug;
    if (fillUsername && (existing.slug === 'user' || existing.slug.length === 0)) {
      const baseSlug = slugify(fillUsername);
      let candidate = baseSlug || 'user';
      let suffix = 1;
      while (true) {
        const slugOwner = await ctx.db
          .query('profiles')
          .withIndex('by_slug', (q) => q.eq('slug', candidate))
          .unique();
        if (!slugOwner || slugOwner.user_id === userId) break;
        suffix += 1;
        candidate = `${baseSlug || 'user'}-${suffix}`;
      }
      nextSlug = candidate;
    }

    if (
      fillUsername !== existing.username ||
      fillAvatar !== existing.avatar_url ||
      nextSlug !== existing.slug
    ) {
      await ctx.db.patch(existing._id, {
        user_id: userId,
        username: fillUsername ?? null,
        avatar_url: fillAvatar ?? null,
        slug: nextSlug,
        updated_at: nowIso(),
      });
      const refreshed = await ctx.db.get(existing._id);
      if (refreshed) {
        return refreshed;
      }
    }
    return existing;
  }

  const username = identityName ?? authUserName;
  const avatarUrl = identityPictureUrl ?? authUserImage;
  const baseSlug = slugify(username ?? 'user');
  let slug = baseSlug || 'user';
  let suffix = 1;
  while (
    await ctx.db
      .query('profiles')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
  ) {
    suffix += 1;
    slug = `${baseSlug || 'user'}-${suffix}`;
  }
  const now = nowIso();
  const _id = await ctx.db.insert('profiles', {
    user_id: userId,
    username: username ?? null,
    avatar_url: avatarUrl ?? null,
    slug,
    created_at: now,
    updated_at: now,
  });
  return await ctx.db.get(_id);
}

export const currentUserId = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    return authUserId ?? null;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return null;
    return await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('user_id', authUserId))
      .unique();
  },
});

export const bootstrapCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const profile = await createProfileIfMissing(ctx, userId);
    if (!profile) throw new Error('Failed to bootstrap profile');
    return profile;
  },
});

export const getById = query({
  args: { id: v.id('profiles') },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) throw new Error(`Profile with id ${args.id} not found`);
    return profile;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!profile) throw new Error(`Profile with slug ${args.slug} not found`);
    return profile;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('profiles').take(500);
  },
});

export const updateCurrent = mutation({
  args: {
    username: v.string(),
    avatar_url: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const profile = await createProfileIfMissing(ctx, userId);
    if (!profile) throw new Error('Profile not found');

    const nextSlugBase = slugify(args.username || 'user');
    let nextSlug = nextSlugBase || 'user';
    let suffix = 1;
    while (true) {
      const slugOwner = await ctx.db
        .query('profiles')
        .withIndex('by_slug', (q) => q.eq('slug', nextSlug))
        .unique();
      if (!slugOwner || slugOwner.user_id === userId) break;
      suffix += 1;
      nextSlug = `${nextSlugBase || 'user'}-${suffix}`;
    }

    await ctx.db.patch(profile._id, {
      username: args.username,
      avatar_url: args.avatar_url,
      slug: nextSlug,
      updated_at: nowIso(),
    });

    const updated = await ctx.db.get(profile._id);
    if (!updated) throw new Error('Failed to update profile');
    return updated;
  },
});
