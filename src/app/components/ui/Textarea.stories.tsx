import preview from '../../../../.storybook/preview';
import { Textarea } from './Input';

const meta = preview.meta({
  component: Textarea,
});

export const Default = meta.story({
  args: {
    placeholder: 'Multiple lines…',
    rows: 4,
  },
});

export const Padded = meta.story({
  args: {
    padded: true,
    placeholder: 'With padding',
    rows: 3,
  },
});
