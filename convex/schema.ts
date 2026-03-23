import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,
  counters: defineTable({
    key: v.string(),
    value: v.number(),
  }).index('by_key', ['key']),
  profiles: defineTable({
    id: v.string(),
    username: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    slug: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_entity_id', ['id'])
    .index('by_slug', ['slug']),
  groups: defineTable({
    id: v.string(),
    name: v.string(),
    created_at: v.string(),
    created_by: v.string(),
  })
    .index('by_entity_id', ['id'])
    .index('by_name', ['name'])
    .index('by_created_by', ['created_by']),
  group_members: defineTable({
    group_id: v.string(),
    user_id: v.string(),
    status: v.union(v.literal('pending'), v.literal('active'), v.literal('removed')),
    requested_at: v.string(),
    approved_at: v.optional(v.union(v.string(), v.null())),
    approved_by: v.optional(v.union(v.string(), v.null())),
  })
    .index('by_group_user', ['group_id', 'user_id'])
    .index('by_group', ['group_id'])
    .index('by_user', ['user_id'])
    .index('by_group_status', ['group_id', 'status']),
  factions: defineTable({
    id: v.string(),
    owner_id: v.string(),
    data: v.any(),
    slug: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
    is_deleted: v.boolean(),
    group_id: v.optional(v.union(v.string(), v.null())),
  })
    .index('by_entity_id', ['id'])
    .index('by_slug', ['slug'])
    .index('by_owner_id', ['owner_id'])
    .index('by_group_id', ['group_id'])
    .index('by_owner_deleted', ['owner_id', 'is_deleted'])
    .index('by_group_deleted', ['group_id', 'is_deleted']),
  rulesets: defineTable({
    id: v.number(),
    name: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
    owner_id: v.string(),
    group_id: v.optional(v.union(v.string(), v.null())),
    is_deleted: v.boolean(),
    image_cover: v.optional(v.union(v.string(), v.null())),
  })
    .index('by_entity_id', ['id'])
    .index('by_name', ['name'])
    .index('by_owner_deleted', ['owner_id', 'is_deleted'])
    .index('by_group_deleted', ['group_id', 'is_deleted'])
    .index('by_deleted_name', ['is_deleted', 'name']),
  ruleset_factions: defineTable({
    ruleset_id: v.number(),
    faction_id: v.string(),
  })
    .index('by_ruleset', ['ruleset_id'])
    .index('by_faction', ['faction_id'])
    .index('by_ruleset_faction', ['ruleset_id', 'faction_id']),
  faq_items: defineTable({
    id: v.number(),
    ruleset_id: v.number(),
    question: v.string(),
    asked_by: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
    accepted_answer_id: v.optional(v.union(v.number(), v.null())),
  })
    .index('by_entity_id', ['id'])
    .index('by_ruleset_created', ['ruleset_id', 'created_at'])
    .index('by_asked_by_created', ['asked_by', 'created_at']),
  faq_answers: defineTable({
    id: v.number(),
    faq_item_id: v.number(),
    answer: v.string(),
    answered_by: v.string(),
    created_at: v.string(),
  })
    .index('by_entity_id', ['id'])
    .index('by_faq_item_created', ['faq_item_id', 'created_at'])
    .index('by_answered_by_created', ['answered_by', 'created_at'])
    .index('by_faq_item_answered_by', ['faq_item_id', 'answered_by']),
});
