import { v } from 'convex/values';

import { faqAnswerSchema, faqQuestionSchema } from '../src/app/faq/validation';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { canAccessRuleset, requireAuthUserId } from './lib/policy';
import { nowIso } from './lib/utils';
import type { MutationCtx, QueryCtx } from './types';

async function getRuleset(ctx: QueryCtx | MutationCtx, id: Id<'rulesets'>) {
  return await ctx.db.get(id);
}

async function getRulesetBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query('rulesets')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
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

function isMissingSlug(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

async function allocateNextFaqItemSlug(
  ctx: MutationCtx,
  rulesetId: Id<'rulesets'>
): Promise<string> {
  const counterKey = `faq_item_slug:${rulesetId}`;
  let counter = await ctx.db
    .query('counters')
    .withIndex('by_key', (q) => q.eq('key', counterKey))
    .unique();

  if (!counter) {
    const inserted = await ctx.db.insert('counters', { key: counterKey, value: 0 });
    counter = await ctx.db.get(inserted);
    if (!counter) throw new Error(`Failed to initialize FAQ slug counter for ruleset ${rulesetId}`);
  }

  let candidate = counter.value + 1;
  while (true) {
    const slug = String(candidate);
    const existing = await ctx.db
      .query('faq_items')
      .withIndex('by_ruleset_slug', (q) => q.eq('ruleset_id', rulesetId).eq('slug', slug))
      .unique();
    if (!existing) {
      await ctx.db.patch(counter._id, { value: candidate });
      return slug;
    }
    candidate += 1;
  }
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

export const detailByRulesetSlugAndQuestionSlug = query({
  args: {
    ruleset_slug: v.string(),
    question_slug: v.string(),
  },
  handler: async (ctx, args) => {
    const ruleset = await getRulesetBySlug(ctx, args.ruleset_slug);
    if (!ruleset || ruleset.is_deleted) {
      throw new Error(`Ruleset with slug ${args.ruleset_slug} not found`);
    }
    const item = await ctx.db
      .query('faq_items')
      .withIndex('by_ruleset_slug', (q) =>
        q.eq('ruleset_id', ruleset._id).eq('slug', args.question_slug)
      )
      .unique();
    if (!item) {
      throw new Error(
        `FAQ item with slug ${args.question_slug} not found in ruleset ${args.ruleset_slug}`
      );
    }
    const answers = await ctx.db
      .query('faq_answers')
      .withIndex('by_faq_item_created', (q) => q.eq('faq_item_id', item._id))
      .take(200);
    const answerers = await Promise.all(
      answers.map((answer) => profileSummary(ctx, answer.answered_by))
    );
    const askerProfile = await profileSummary(ctx, item.asked_by);
    return {
      ...item,
      ruleset: {
        id: ruleset._id,
        slug: ruleset.slug ?? null,
        name: ruleset.name,
      },
      asker_profile: askerProfile,
      faq_answers: answers.map((answer, index) => ({
        ...answer,
        answerer_profile: answerers[index],
      })),
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
          ruleset: { id: ruleset._id, name: ruleset.name, slug: ruleset.slug ?? null },
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
            slug: isMissingSlug(item.slug) ? null : item.slug,
            question: item.question,
            ruleset_id: item.ruleset_id,
            asked_by: item.asked_by,
            accepted_answer_id: item.accepted_answer_id ?? null,
          },
          asker_profile: await profileSummary(ctx, item.asked_by),
          ruleset: {
            id: ruleset._id,
            name: ruleset.name,
            slug: ruleset.slug ?? null,
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
    const parsedQuestion = faqQuestionSchema.safeParse(args.question);
    if (!parsedQuestion.success) {
      const msg = parsedQuestion.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid FAQ input');
    }
    const normalizedQuestion = parsedQuestion.data;

    const now = nowIso();
    const slug = await allocateNextFaqItemSlug(ctx, args.ruleset_id);
    const faqItemId = await ctx.db.insert('faq_items', {
      ruleset_id: args.ruleset_id,
      slug,
      question: normalizedQuestion,
      asked_by: userId,
      created_at: now,
      updated_at: now,
      accepted_answer_id: null,
    });
    const row = await ctx.db.get(faqItemId);
    if (!row) throw new Error('Failed to create FAQ item');

    const normalizedInitialAnswer = args.answer?.trim();
    if (normalizedInitialAnswer && normalizedInitialAnswer.length > 0) {
      const parsedAnswer = faqAnswerSchema.safeParse(normalizedInitialAnswer);
      if (!parsedAnswer.success) {
        const msg = parsedAnswer.error.issues.map((i) => i.message).join(' ');
        throw new Error(msg || 'Invalid FAQ input');
      }
      await ctx.db.insert('faq_answers', {
        faq_item_id: row._id,
        answer: parsedAnswer.data,
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
    if (args.question !== undefined) {
      const parsedQuestion = faqQuestionSchema.safeParse(args.question);
      if (!parsedQuestion.success) {
        const msg = parsedQuestion.error.issues.map((i) => i.message).join(' ');
        throw new Error(msg || 'Invalid FAQ input');
      }
      patch.question = parsedQuestion.data;
    }
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
    const parsedAnswer = faqAnswerSchema.safeParse(args.answer);
    if (!parsedAnswer.success) {
      const msg = parsedAnswer.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid FAQ input');
    }
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
      answer: parsedAnswer.data,
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
    const parsedAnswer = faqAnswerSchema.safeParse(args.answer);
    if (!parsedAnswer.success) {
      const msg = parsedAnswer.error.issues.map((i) => i.message).join(' ');
      throw new Error(msg || 'Invalid FAQ input');
    }
    const answer = await getFaqAnswer(ctx, args.id);
    if (!answer) throw new Error(`FAQ answer ${args.id} not found`);
    if (answer.answered_by !== userId) throw new Error('Not authorized');

    await ctx.db.patch(answer._id, { answer: parsedAnswer.data });
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
