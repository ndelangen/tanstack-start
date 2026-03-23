import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

import { nextNumberId } from './lib/ids';
import { canAccessRuleset, requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';
import type { MutationCtx, QueryCtx } from './types';

async function getRuleset(ctx: QueryCtx | MutationCtx, id: number) {
  return await ctx.db
    .query('rulesets')
    .withIndex('by_entity_id', (q) => q.eq('id', id))
    .unique();
}

async function getFaqItem(ctx: QueryCtx | MutationCtx, id: number) {
  return await ctx.db
    .query('faq_items')
    .withIndex('by_entity_id', (q) => q.eq('id', id))
    .unique();
}

async function getFaqAnswer(ctx: QueryCtx | MutationCtx, id: number) {
  return await ctx.db
    .query('faq_answers')
    .withIndex('by_entity_id', (q) => q.eq('id', id))
    .unique();
}

async function profileSummary(ctx: QueryCtx | MutationCtx, id: string) {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_entity_id', (q) => q.eq('id', id))
    .unique();
  if (!profile) return null;
  return {
    id: profile.id,
    slug: profile.slug,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
  };
}

export const byRuleset = query({
  args: { ruleset_id: v.number() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('faq_items')
      .withIndex('by_ruleset_created', (q) => q.eq('ruleset_id', args.ruleset_id))
      .collect();
    const sorted = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (sorted.length === 0) return [];

    const answers = await Promise.all(
      sorted.map((item) =>
        ctx.db
          .query('faq_answers')
          .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item.id))
          .collect()
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
  args: { id: v.number() },
  handler: async (ctx, args) => {
    const item = await getFaqItem(ctx, args.id);
    if (!item) throw new Error(`FAQ item ${args.id} not found`);
    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', args.id))
      .collect();
    return {
      ...item,
      faq_answers: answers,
    };
  },
});

export const askedBy = query({
  args: { profile_id: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('faq_items')
      .withIndex('by_asked_by_created', (q) => q.eq('asked_by', args.profile_id))
      .collect();
    const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return await Promise.all(
      sorted.map(async (item) => {
        const ruleset = await getRuleset(ctx, item.ruleset_id);
        if (!ruleset) throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item.id}`);
        return {
          ...item,
          ruleset: { id: ruleset.id, name: ruleset.name },
        };
      })
    );
  },
});

export const answeredBy = query({
  args: { profile_id: v.string() },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_answered_by_created', (q) => q.eq('answered_by', args.profile_id))
      .collect();
    const sorted = [...answers].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return await Promise.all(
      sorted.map(async (answer) => {
        const item = await getFaqItem(ctx, answer.faq_item_id);
        if (!item)
          throw new Error(`FAQ item ${answer.faq_item_id} missing for answer ${answer.id}`);
        const ruleset = await getRuleset(ctx, item.ruleset_id);
        if (!ruleset) throw new Error(`Ruleset ${item.ruleset_id} missing for FAQ item ${item.id}`);
        return {
          ...answer,
          faq_item: {
            id: item.id,
            question: item.question,
            ruleset_id: item.ruleset_id,
            asked_by: item.asked_by,
            accepted_answer_id: item.accepted_answer_id ?? null,
          },
          asker_profile: await profileSummary(ctx, item.asked_by),
          ruleset: {
            id: ruleset.id,
            name: ruleset.name,
          },
        };
      })
    );
  },
});

export const createItem = mutation({
  args: {
    ruleset_id: v.number(),
    question: v.string(),
    answer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const ruleset = await getRuleset(ctx, args.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');

    const now = nowIso();
    const id = await nextNumberId(ctx, 'faq_items');
    const faqItemId = await ctx.db.insert('faq_items', {
      id,
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
      const answerId = await nextNumberId(ctx, 'faq_answers');
      await ctx.db.insert('faq_answers', {
        id: answerId,
        faq_item_id: row.id,
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
    id: v.number(),
    question: v.optional(v.string()),
    accepted_answer_id: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const item = await getFaqItem(ctx, args.id);
    if (!item) throw new Error(`FAQ item ${args.id} not found`);

    const ruleset = await getRuleset(ctx, item.ruleset_id);
    if (!ruleset || ruleset.is_deleted) throw new Error('Ruleset not found');
    const allowed = await canAccessRuleset(ctx, ruleset, userId);
    if (item.asked_by !== userId || !allowed) throw new Error('Not authorized');

    const patch: { updated_at: string; question?: string; accepted_answer_id?: number | null } = {
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
    faq_item_id: v.number(),
    accepted_answer_id: v.union(v.number(), v.null()),
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
  args: { id: v.number() },
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
      .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item.id))
      .collect();
    await Promise.all(answers.map((answer) => ctx.db.delete(answer._id)));
    await ctx.db.delete(item._id);
    return { id: args.id, rulesetId: item.ruleset_id, askedBy: item.asked_by };
  },
});

export const createAnswer = mutation({
  args: {
    faq_item_id: v.number(),
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

    const id = await nextNumberId(ctx, 'faq_answers');
    const _id = await ctx.db.insert('faq_answers', {
      id,
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
  args: { id: v.number(), answer: v.string() },
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
  args: { id: v.number() },
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
