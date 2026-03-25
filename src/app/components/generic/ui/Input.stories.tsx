import preview from '@storybook/preview';
import { Input } from './Input';

const meta = preview.meta({
  component: Input,
});

export const Default = meta.story({
  args: {
    placeholder: 'Single-line…',
    type: 'text',
  },
});

export const Unpadded = meta.story({
  args: {
    padded: false,
    placeholder: 'No inner padding',
    type: 'text',
  },
});

export const Invalid = meta.story({
  args: {
    'aria-invalid': true,
    defaultValue: 'Bad value',
    type: 'text',
  },
});

export const Disabled = meta.story({
  args: {
    defaultValue: 'Read-only',
    disabled: true,
    type: 'text',
  },
});
