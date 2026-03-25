import preview from '@storybook/preview';
import { MultilineTextField } from './MultilineTextField';

const meta = preview.meta({
  component: MultilineTextField,
});

export const Default = meta.story({
  args: {
    placeholder: 'Description',
    rows: 4,
  },
});
