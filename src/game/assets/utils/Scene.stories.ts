import preview from '@sb/preview';

import sceneAtreides from '@game/fixtures/sceneAtreides';

import { Scene } from './Scene';

const meta = preview.meta({
  component: Scene,
  globals: {
    viewport: {
      value: 'scene',
    },
  },
});

export const Default = meta.story({
  args: sceneAtreides,
});
