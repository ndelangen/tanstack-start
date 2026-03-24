import SHA256 from 'crypto-js/sha256';
import { z } from 'zod';

import { ALL, GENERATED, GENERIC, LEADERS, LOGO, TROOP, TROOP_MODIFIER } from '../data/generated';

const STRENGTH = z.union([z.number().int(), z.string().length(1)]);
const OFFSET = z.tuple([z.number(), z.number()]);
const SCALE = z.number().min(0).max(1);
const URL = GENERATED.or(z.url());
const HEXCOLOR = z.string().regex(/^#[0-9a-f]{6}$/i);

const RULE = z.strictObject({
  title: z.string().optional(),
  text: z.string(),
  karama: z.string().optional(),
});

export const Leader = z.strictObject({
  name: z.string(),
  strength: STRENGTH.optional(),
  image: LEADERS,
});

export const Decal = z.strictObject({
  id: ALL,
  muted: z.boolean(),
  outline: z.boolean(),
  scale: SCALE,
  offset: OFFSET,
});

export const TroopSide = z.strictObject({
  image: TROOP,
  name: z.string(),
  description: z.string(),
  star: TROOP_MODIFIER.optional(),
  striped: z.boolean().optional(),
});

export const Troop = z.strictObject({
  image: TROOP,
  name: z.string(),
  description: z.string(),
  star: TROOP_MODIFIER.optional(),
  striped: z.boolean().optional(),
  back: TroopSide.optional(),
  count: z.number().int().positive(),
  planet: z.string().optional(),
});

export const GRADIENT = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('linear'),
    angle: z.number().int().min(0).max(360),
    stops: z.array(z.tuple([HEXCOLOR, SCALE])),
  }),
  z.strictObject({
    type: z.literal('radial'),
    x: z.number().optional(),
    y: z.number().optional(),
    r: z.number().optional(),
    stops: z.array(z.tuple([HEXCOLOR, SCALE])),
  }),
]);

const BACKGROUND_COLOR = z.union([HEXCOLOR, GRADIENT]);

export const Background = z.strictObject({
  image: z.string(),
  colors: z.tuple([BACKGROUND_COLOR, BACKGROUND_COLOR]),
  strength: SCALE,
  opacity: SCALE,
});

export const TTSColor = z.enum([
  'White',
  'Brown',
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Teal',
  'Blue',
  'Purple',
  'Pink',
]);

export const FactionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+$/),
  name: z.string(),
  logo: LOGO.or(GENERIC),
  background: Background,
  themeColor: HEXCOLOR,

  /** closest matching TTS colors */
  colors: z.array(TTSColor),

  /** used on the shield */
  hero: Leader.omit({ strength: true }),
  leaders: z.array(Leader),

  /** used for alliance-cards */
  decals: z.array(Decal),
  planet: z
    .array(
      z.strictObject({
        image: URL,
        name: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  troops: z.array(Troop),

  rules: z.strictObject({
    startText: z.string(),
    revivalText: z.string(),
    spiceCount: z.number().int().positive(),
    advantages: z.array(RULE),
    fate: RULE.omit({ karama: true }),
    alliance: RULE.omit({ karama: true, title: true }).required(),
  }),

  /** extra game assets, used by TTS */
  extras: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        items: z.array(z.object({ url: URL, description: z.string().optional() })),
      })
    )
    .optional(),
});

export type FactionData = z.infer<typeof FactionSchema>;

function toHash(input: Record<string, unknown>) {
  return SHA256(JSON.stringify(input)).toString().slice(0, 16);
}

function toSimple(input: string) {
  return input.replace(/ /g, '-').toLowerCase();
}

/** Lowercase [a-z0-9] only; matches DB slugify base (no numeric uniqueness suffix). */
export function factionSlugBaseFromName(name: string): string {
  const raw = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
  return raw || 'faction';
}

export const FactionAssets = {
  shield: FactionSchema.transform((input) => ({
    name: input.name,
    leader: `/generated/leader/${input.id}/${toSimple(input.hero.name)}.jpg`,
    logo: `/generated/logo/${input.id}.jpg`,
  })),
  token: FactionSchema.transform((input) => ({
    logo: input.logo,
    background: `/generated/background/${toHash(input.background)}.jpg`,
  })),
  sheet: FactionSchema.transform((input) => ({
    name: input.name,
    logo: `/generated/logo/${input.id}.jpg`,
    leaders: input.leaders.map(
      (leader) => `/generated/leader/${input.id}/${toSimple(leader.name)}.jpg`
    ),
    themeColor: input.themeColor,
    troops: input.troops.map((troop) => ({
      image: `/generated/troop/${input.id}/${toSimple(troop.name)}.jpg`,
      name: troop.name,
      description: troop.description,
      back: troop.back
        ? {
            image: `/generated/troop/${input.id}/${toSimple(troop.back.name)}.jpg`,
            name: troop.back.name,
            description: troop.back.description,
          }
        : undefined,
    })),
    rules: input.rules,
  })),
  planet: FactionSchema.transform((input) => input.planet),
  alliance: FactionSchema.transform((input) => ({
    title: input.name,
    text: input.rules.alliance.text,
    logo: input.logo,
    background: `/generated/background/${toHash(input.background)}.jpg`,
    troop: input.troops[0]?.image,
    decals: input.decals,
  })),
  leaders: FactionSchema.transform((input) =>
    input.leaders.map((leader) => ({
      ...leader,
      background: `/generated/background/${toHash(input.background)}.jpg`,
      logo: input.logo,
    }))
  ),
  traitors: FactionSchema.transform((input) =>
    input.leaders.map((leader) => ({
      ...leader,
      logo: input.logo,
      background: `/generated/background/${toHash(input.background)}.jpg`,
      owner: input.name,
    }))
  ),
  troops: FactionSchema.transform((input) =>
    input.troops.flatMap((troop) => [
      {
        image: troop.image,
        background: `/generated/background/${toHash(input.background)}.jpg`,
        star: troop.star,
        striped: troop.striped,
      },
      ...(troop.back
        ? [
            {
              image: troop.back.image,
              background: `/generated/background/${toHash(input.background)}.jpg`,
              star: troop.back.star,
              striped: troop.back.striped,
            },
          ]
        : []),
    ])
  ),
};

export const FactionPreview = {
  alliance: FactionSchema.transform((input) => ({
    title: input.name,
    text: input.rules.alliance.text,
    logo: input.logo,
    background: input.background,
    troop: input.troops[0]?.image,
    decals: input.decals,
  })),
  leaders: FactionSchema.transform((input) =>
    input.leaders.map((leader) => ({
      ...leader,
      background: input.background,
      logo: input.logo,
    }))
  ),
  traitors: FactionSchema.transform((input) =>
    input.leaders.map((leader) => ({
      ...leader,
      logo: input.logo,
      background: input.background,
      owner: input.name,
    }))
  ),
  troops: FactionSchema.transform((input) =>
    input.troops.map((troop) => ({
      image: troop.image,
      background: input.background,
      star: troop.star,
      striped: troop.striped,
    }))
  ),
  planet: FactionSchema.transform((input) => input.planet),
  shield: FactionSchema.transform((input) => ({
    name: input.name,
    leader: input.hero,
    background: input.background,
    logo: input.logo,
  })),
  sheet: FactionSchema.transform((input) => ({
    name: input.name,
    themeColor: input.themeColor,
    logo: input.logo,
    background: input.background,
    leaders: input.leaders,
    troops: input.troops,
    rules: input.rules,
  })),
  token: FactionSchema.transform((input) => ({
    logo: input.logo,
    background: input.background,
  })),
} satisfies Record<keyof typeof FactionAssets, unknown>;
