/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';

import { assetPublishingFaction } from '../src/game/fixtures/assetPublishingFaction';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

test('faction detail bundles active linked rulesets', async () => {
  const t = convexTest(schema, modules);
  const { factionSlug } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert('users', { name: 'Faction detail owner' });
    await ctx.db.insert('profiles', {
      user_id: ownerId,
      username: 'Faction detail owner',
      avatar_url: null,
      slug: 'faction-detail-owner',
      created_at: '2026-07-18T12:00:00.000Z',
      updated_at: '2026-07-18T12:00:00.000Z',
    });
    const factionId = await ctx.db.insert('factions', {
      owner_id: ownerId,
      data: assetPublishingFaction,
      slug: 'faction-detail',
      created_at: '2026-07-18T12:00:00.000Z',
      updated_at: '2026-07-18T12:00:00.000Z',
      is_deleted: false,
      group_id: null,
    });
    const activeRulesetId = await ctx.db.insert('rulesets', {
      name: 'Active ruleset',
      slug: 'active-ruleset',
      created_at: '2026-07-18T12:00:00.000Z',
      updated_at: '2026-07-18T12:00:00.000Z',
      owner_id: ownerId,
      group_id: null,
      is_deleted: false,
      image_cover: null,
    });
    const deletedRulesetId = await ctx.db.insert('rulesets', {
      name: 'Deleted ruleset',
      slug: 'deleted-ruleset',
      created_at: '2026-07-18T12:00:00.000Z',
      updated_at: '2026-07-18T12:00:00.000Z',
      owner_id: ownerId,
      group_id: null,
      is_deleted: true,
      image_cover: null,
    });
    await ctx.db.insert('ruleset_factions', {
      faction_id: factionId,
      ruleset_id: activeRulesetId,
    });
    await ctx.db.insert('ruleset_factions', {
      faction_id: factionId,
      ruleset_id: deletedRulesetId,
    });
    return { factionSlug: 'faction-detail' };
  });

  const detail = await t.query(api.factions.getBySlug, { slug: factionSlug });

  expect(detail.rulesets.map((ruleset) => ruleset.slug)).toEqual(['active-ruleset']);
});
