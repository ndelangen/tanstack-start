import preview from '@sb/preview';

import { TraitorCard } from './Traitor';

const meta = preview.meta({
  component: TraitorCard,
  globals: {
    viewport: {
      value: 'card',
    },
  },
  argTypes: {
    image: {
      control: {
        type: 'select',
      },
    },
  },
});

export const Asset = meta.story({
  args: {
    background: '/generated/utils/background/moritani.jpg',
    image: '/image/leader/official/tessia.png',
    logo: '/vector/logo/moritani.svg',
    name: 'Vando Terboli',
    strength: '1',
    owner: 'Moritani',
  },
});

export const Preview = meta.story({
  args: {
    background: {
      image: '/image/texture/021.jpg',
      colors: ['red', 'blue'],
      opacity: 0,
      strength: 0,
    },
    image: '/image/leader/official/tessia.png',
    logo: '/vector/logo/moritani.svg',
    name: 'Vando Terboli',
    strength: '1',
    owner: 'Moritani',
  },
});
