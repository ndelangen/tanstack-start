import preview from '@storybook/preview';
import { LeaderToken } from './Leader';

const meta = preview.meta({
  component: LeaderToken,
  globals: {
    viewport: {
      value: 'disc',
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
    image: 'image/leader/official/tessia.png',
    logo: 'vector/logo/moritani.svg',
    name: 'Vando Terboli',
    strength: '1',
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
    image: 'image/leader/official/tessia.png',
    logo: 'vector/logo/moritani.svg',
    name: 'Vando Terboli',
    cool: true,
    strength: '1',
  },
});
