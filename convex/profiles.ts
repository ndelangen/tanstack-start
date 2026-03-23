import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

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
  const existingByLegacyId =
    existing ??
    (await ctx.db
      .query('profiles')
      .withIndex('by_entity_id', (q) => q.eq('id', String(userId)))
      .unique());
  if (existingByLegacyId) {
    const fillUsername = existingByLegacyId.username ?? identityName ?? authUserName;
    const fillAvatar = existingByLegacyId.avatar_url ?? identityPictureUrl ?? authUserImage;
    let nextSlug = existingByLegacyId.slug;
    if (fillUsername && (existingByLegacyId.slug === 'user' || existingByLegacyId.slug.length === 0)) {
      const baseSlug = slugify(fillUsername);
      let candidate = baseSlug || 'user';
      let suffix = 1;
      while (true) {
        const slugOwner = await ctx.db
          .query('profiles')
          .withIndex('by_slug', (q) => q.eq('slug', candidate))
          .unique();
        if (!slugOwner || String(slugOwner.user_id ?? slugOwner.id ?? '') === String(userId)) break;
        suffix += 1;
        candidate = `${baseSlug || 'user'}-${suffix}`;
      }
      nextSlug = candidate;
    }

    if (
      fillUsername !== existingByLegacyId.username ||
      fillAvatar !== existingByLegacyId.avatar_url ||
      nextSlug !== existingByLegacyId.slug
    ) {
      await ctx.db.patch(existingByLegacyId._id, {
        user_id: userId,
        username: fillUsername ?? undefined,
        avatar_url: fillAvatar ?? undefined,
        slug: nextSlug,
        updated_at: nowIso(),
      });
      const refreshed = await ctx.db.get(existingByLegacyId._id);
      if (refreshed) {
        return refreshed;
      }
    }
    return existingByLegacyId;
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
    username: username ?? undefined,
    avatar_url: avatarUrl ?? undefined,
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
    const profileByUserId = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('user_id', authUserId))
      .unique();
    if (profileByUserId) return profileByUserId;
    const profileByLegacyId = await ctx.db
      .query('profiles')
      .withIndex('by_entity_id', (q) => q.eq('id', String(authUserId)))
      .unique();
    return profileByLegacyId ?? null;
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
    return await ctx.db.query('profiles').collect();
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
        if (!slugOwner || String(slugOwner.user_id ?? slugOwner.id ?? '') === String(userId)) break;
      suffix += 1;
      nextSlug = `${nextSlugBase || 'user'}-${suffix}`;
    }

    await ctx.db.patch(profile._id, {
      username: args.username,
      avatar_url: args.avatar_url ?? undefined,
      slug: nextSlug,
      updated_at: nowIso(),
    });

    const updated = await ctx.db.get(profile._id);
    if (!updated) throw new Error('Failed to update profile');
    return updated;
  },
});
