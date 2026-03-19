import { LEADERS, LOGO, TROOP } from '@game/data/generated';
import { FactionSchema, factionSlugBaseFromName } from '@game/schema/faction';

/** Valid starter document for the faction editor (create + reset). */
export const defaultFaction = FactionSchema.parse({
  id: factionSlugBaseFromName('New faction'),
  name: 'New faction',
  logo: LOGO.options[0],
  colors: ['Green', 'Teal'],
  background: {
    image: 'image/texture/021.jpg',
    colors: ['#444444', '#222222'],
    opacity: 1,
    strength: 0.5,
  },
  themeColor: '#444444',
  hero: {
    name: 'Hero',
    image: LEADERS.options[0],
  },
  leaders: [
    {
      name: 'Leader',
      strength: '2',
      image: LEADERS.options[0],
    },
  ],
  decals: [],
  planet: [],
  troops: [
    {
      name: 'Troop',
      image: TROOP.options[0],
      description: 'Troop',
      count: 20,
    },
  ],
  rules: {
    startText: 'Starting rules text.',
    revivalText: 'Revival rules text.',
    spiceCount: 10,
    advantages: [],
    alliance: {
      text: 'Alliance rules text.',
    },
    fate: {
      title: 'Fate',
      text: 'Fate rules text.',
    },
  },
});
