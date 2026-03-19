import sceneAtreides from '@game/fixtures/sceneAtreides';

import preview from '../../../../.storybook/preview';
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
