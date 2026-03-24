import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { canAccessRuleset, requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';
import type { MutationCtx, QueryCtx } from './types';

async function getRuleset(ctx: QueryCtx | MutationCtx, id: Id<'rulesets'>) {
  return await ctx.db.get(id);
}

async function getFaqItem(ctx: QueryCtx | MutationCtx, id: Id<'faq_items'>) {
  return await ctx.db.get(id);
}

async function getFaqAnswer(ctx: QueryCtx | MutationCtx, id: Id<'faq_answers'>) {
  return await ctx.db.get(id);
}

async function profileSummary(ctx: QueryCtx | MutationCtx, id: Id<'users'>) {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_user_id', (q) => q.eq('user_id', id))
    .unique();
  if (!profile) return null;
  return {
    id: profile._id,
    slug: profile.slug,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
  };
}

export const byRuleset = query({
  args: { ruleset_id: v.id('rulesets') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('faq_items')
      .withIndex('by_ruleset_created', (q) => q.eq('ruleset_id', args.ruleset_id))
      .take(200);
    const sorted = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (sorted.length === 0) return [];

    const answers = await Promise.all(
      sorted.map((item) =>
        ctx.db
          .query('faq_answers')
          .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item._id))
          .take(50)
      )
    );
    const askers = await Promise.all(sorted.map((item) => profileSummary(ctx, item.asked_by)));

    return sorted.map((item, index) => ({
      ...item,
      faq_answers: answers[index],
      asker_profile: askers[index],
    }));
  },
});

export const detail = query({
  args: { id: v.id('faq_items') },
  handler: async (ctx, args) => {
    const item = await getFaqItem(ctx, args.id);
    if (!item) throw new Error(`FAQ item ${args.id} not found`);
    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item._id))
      .take(200);
    return {
      ...item,
      faq_answers: answers,
    };
  },
});

export const askedBy = query({
  args: { profile_id: v.id('users') },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('faq_items')
      .withIndex('by_asked_by_created', (q) => q.eq('asked_by', args.profile_id))
      .take(200);
    const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return await Promise.all(
      sorted.map(async (item) => {
        const ruleset = await getRuleset(ctx, item.ruleset_id);
        if (!ruleset)
          throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item._id}`);
        return {
          ...item,
          ruleset: { id: ruleset._id, name: ruleset.name },
        };
      })
    );
  },
});

export const answeredBy = query({
  args: { profile_id: v.id('users') },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_answered_by_created', (q) => q.eq('answered_by', args.profile_id))
      .take(200);
    const sorted = [...answers].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return await Promise.all(
      sorted.map(async (answer) => {
        const item = await getFaqItem(ctx, answer.faq_item_id);
        if (!item)
          throw new Error(`FAQ item ${answer.faq_item_id} missing for answer ${answer._id}`);
        const ruleset = await getRuleset(ctx, item.ruleset_id);
        if (!ruleset)
          throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item._id}`);
        return {
          ...answer,
          faq_item: {
            id: item._id,
            question: item.question,
            ruleset_id: item.ruleset_id,
            asked_by: item.asked_by,
            accepted_answer_id: item.accepted_answer_id ?? null,
          },
          asker_profile: await profileSummary(ctx, item.asked_by),
          ruleset: {
            id: ruleset._id,
            name: ruleset.name,
          },
        };
      })
    );
  },
});

export const createItem = mutation({
  args: {
    ruleset_id: v.id('rulesets'),
    question: v.string(),
    answer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const ruleset = await getRuleset(ctx, args.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');

    const now = nowIso();
    const faqItemId = await ctx.db.insert('faq_items', {
      ruleset_id: args.ruleset_id,
      question: args.question,
      asked_by: userId,
      created_at: now,
      updated_at: now,
      accepted_answer_id: null,
    });
    const row = await ctx.db.get(faqItemId);
    if (!row) throw new Error('Failed to create FAQ item');

    if (args.answer && args.answer.trim().length > 0) {
      await ctx.db.insert('faq_answers', {
        faq_item_id: row._id,
        answer: args.answer.trim(),
        answered_by: userId,
        created_at: nowIso(),
      });
    }

    return row;
  },
});

export const updateItem = mutation({
  args: {
    id: v.id('faq_items'),
    question: v.optional(v.string()),
    accepted_answer_id: v.optional(v.union(v.id('faq_answers'), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await getFaqItem(ctx, args.id);
    if (!item) throw new Error(`FAQ item ${args.id} not found`);

    const ruleset = await getRuleset(ctx, item.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');
    const allowed = await canAccessRuleset(ctx, ruleset, userId);
    if (item.asked_by !== userId || !allowed) throw new Error('Not authorized');

    const patch: {
      updated_at: string;
      question?: string;
      accepted_answer_id?: Id<'faq_answers'> | null;
    } = {
      updated_at: nowIso(),
    };
    if (args.question !== undefined) patch.question = args.question;
    if (args.accepted_answer_id !== undefined) patch.accepted_answer_id = args.accepted_answer_id;

    await ctx.db.patch(item._id, patch);
    const updated = await ctx.db.get(item._id);
    if (!updated) throw new Error(`FAQ item ${args.id} not found`);
    return updated;
  },
});

export const setAcceptedAnswer = mutation({
  args: {
    faq_item_id: v.id('faq_items'),
    accepted_answer_id: v.union(v.id('faq_answers'), v.null()),
  },
  handler: async (ctx, args) => {
    const item = await getFaqItem(ctx, args.faq_item_id);
    if (!item) throw new Error(`FAQ item ${args.faq_item_id} not found`);
    const userId = await requireAuthUserId(ctx);
    const ruleset = await getRuleset(ctx, item.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');
    const allowed = await canAccessRuleset(ctx, ruleset, userId);
    if (item.asked_by !== userId || !allowed) throw new Error('Not authorized');

    await ctx.db.patch(item._id, {
      accepted_answer_id: args.accepted_answer_id,
      updated_at: nowIso(),
    });
    const updated = await ctx.db.get(item._id);
    if (!updated) throw new Error(`FAQ item ${args.faq_item_id} not found`);
    return updated;
  },
});

export const deleteItem = mutation({
  args: { id: v.id('faq_items') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await getFaqItem(ctx, args.id);
    if (!item) throw new Error(`FAQ item ${args.id} not found`);

    const ruleset = await getRuleset(ctx, item.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');
    const allowed = await canAccessRuleset(ctx, ruleset, userId);
    if (item.asked_by !== userId || !allowed) throw new Error('Not authorized');

    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item._id))
      .take(500);
    await Promise.all(answers.map((answer) => ctx.db.delete(answer._id)));
    await ctx.db.delete(item._id);
    return { id: args.id, rulesetId: item.ruleset_id, askedBy: item.asked_by };
  },
});

export const createAnswer = mutation({
  args: {
    faq_item_id: v.id('faq_items'),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await getFaqItem(ctx, args.faq_item_id);
    if (!item) throw new Error('FAQ item not found');
    const ruleset = await getRuleset(ctx, item.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');

    const existing = await ctx.db
      .query('faq_answers')
      .withIndex('by_faq_item_answered_by', (q) =>
        q.eq('faq_item_id', args.faq_item_id).eq('answered_by', userId)
      )
      .unique();
    if (existing) throw new Error('You already answered this question');

    const _id = await ctx.db.insert('faq_answers', {
      faq_item_id: args.faq_item_id,
      answer: args.answer,
      answered_by: userId,
      created_at: nowIso(),
    });
    const row = await ctx.db.get(_id);
    if (!row) throw new Error('Failed to create FAQ answer');
    return row;
  },
});

export const updateAnswer = mutation({
  args: { id: v.id('faq_answers'), answer: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const answer = await getFaqAnswer(ctx, args.id);
    if (!answer) throw new Error(`FAQ answer ${args.id} not found`);
    if (answer.answered_by !== userId) throw new Error('Not authorized');

    await ctx.db.patch(answer._id, { answer: args.answer });
    const updated = await ctx.db.get(answer._id);
    if (!updated) throw new Error(`FAQ answer ${args.id} not found`);
    return updated;
  },
});

export const deleteAnswer = mutation({
  args: { id: v.id('faq_answers') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const answer = await getFaqAnswer(ctx, args.id);
    if (!answer) throw new Error(`FAQ answer ${args.id} not found`);

    const item = await getFaqItem(ctx, answer.faq_item_id);
    if (!item) throw new Error(`FAQ item ${answer.faq_item_id} not found`);
    if (answer.answered_by !== userId && item.asked_by !== userId) {
      throw new Error('Not authorized');
    }

    await ctx.db.delete(answer._id);
    return { id: args.id, faqItemId: answer.faq_item_id, answeredBy: answer.answered_by };
  },
});
