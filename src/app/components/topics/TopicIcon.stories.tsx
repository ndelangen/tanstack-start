import preview from '@sb/preview';

import { TopicIcon } from './TopicIcon';

const meta = preview.meta({
  component: TopicIcon,
  parameters: {
    layout: 'centered',
  },
  args: {
    topic: 'identity',
    size: 32,
  },
});

export const Identity = meta.story({
  args: { topic: 'identity' },
});

export const Background = meta.story({
  args: { topic: 'background' },
});

export const Hero = meta.story({
  args: { topic: 'hero' },
});

export const Leaders = meta.story({
  args: { topic: 'leaders' },
});

export const Alliance = meta.story({
  args: { topic: 'alliance' },
});

export const Decals = meta.story({
  args: { topic: 'decals' },
});

export const Troops = meta.story({
  args: { topic: 'troops' },
});

export const Rules = meta.story({
  args: { topic: 'rules' },
});

export const Advantages = meta.story({
  args: { topic: 'advantages' },
});
