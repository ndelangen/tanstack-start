import preview from '@sb/preview';

import { TextField } from './TextField';

const meta = preview.meta({
  component: TextField,
});

export const Default = meta.story({
  args: {
    placeholder: 'Name',
    type: 'text',
  },
});
