import { describe, expect, it } from 'vitest';

import { assetPublishingFaction } from '../fixtures/assetPublishingFaction';
import {
  Background,
  FactionInputSchema,
  FactionStoredSchema,
  LegacyFactionInputSchema,
  migrateLegacyBackground,
  toLegacyFactionInput,
} from './faction';

describe('faction background migration contract', () => {
  it('maps legacy fields without changing their values and defaults inversion on', () => {
    expect(
      migrateLegacyBackground({
        image: '/image/texture/021.jpg',
        colors: ['#112233', '#445566'],
        strength: 0.36,
        opacity: 0.88,
      })
    ).toEqual({
      image: '/image/texture/021.jpg',
      colors: ['#112233', '#445566'],
      invert: true,
      definition: 0.36,
      influence: 0.88,
    });
  });

  it('normalizes a complete legacy faction while canonical input rejects legacy fields', () => {
    const legacy = {
      ...structuredClone(assetPublishingFaction),
      background: {
        image: '/image/texture/021.jpg',
        colors: ['#4b4c0d', '#d9c979'],
        strength: 0.55,
        opacity: 1,
      },
    };

    expect(FactionInputSchema.safeParse(legacy).success).toBe(false);
    expect(FactionStoredSchema.parse(legacy).background).toEqual({
      image: '/image/texture/021.jpg',
      colors: ['#4b4c0d', '#d9c979'],
      invert: true,
      definition: 0.55,
      influence: 1,
    });
  });

  it('keeps public reads compatible with the deployed legacy client during widening', () => {
    const legacy = toLegacyFactionInput(assetPublishingFaction);

    expect(LegacyFactionInputSchema.parse(legacy).background).toEqual({
      image: assetPublishingFaction.background.image,
      colors: assetPublishingFaction.background.colors,
      strength: assetPublishingFaction.background.definition,
      opacity: assetPublishingFaction.background.influence,
    });
    expect(FactionStoredSchema.parse(legacy)).toEqual(assetPublishingFaction);
  });

  it.each([
    ['definition', -0.01],
    ['definition', 1.01],
    ['influence', -0.01],
    ['influence', 1.01],
  ] as const)('rejects %s outside the inclusive zero-to-one range', (field, value) => {
    const background = {
      ...structuredClone(assetPublishingFaction.background),
      [field]: value,
    };

    expect(Background.safeParse(background).success).toBe(false);
  });
});
