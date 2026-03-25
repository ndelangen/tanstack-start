import preview from '@storybook/preview';
import { Shield } from './Shield';

const meta = preview.meta({
  component: Shield,
  globals: {
    viewport: {
      value: 'shield',
    },
  },
});

export const Asset = meta.story({
  args: {
    leader: '/generated/token/leader/atreides/hero.jpg',
    logo: '/generated/token/faction/atreides.jpg',
    name: 'Atreides',
  },
});

export const Preview = meta.story({
  args: {
    background: {
      image: 'image/texture/021.jpg',
      colors: ['red', 'blue'],
      opacity: 0,
      strength: 0,
    },
    leader: {
      name: 'Atreides',
      image: 'image/leader/official/paul.jpg',
    },
    logo: 'vector/logo/atreides.svg',
    name: 'Atreides',
  },
});
