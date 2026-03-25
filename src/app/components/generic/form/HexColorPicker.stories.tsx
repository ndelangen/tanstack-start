import preview from '@storybook/preview';

import { HexColorPicker } from './HexColorPicker';

const meta = preview.meta({
  component: HexColorPicker,
});

export const SolidHex = meta.story({
  args: {
    value: '#c78346',
    onChange: () => {},
    pickerAriaLabel: 'Pick background color',
  },
});
