import preview from '@sb/preview';
import { Save, Trash2 } from 'lucide-react';

import { FormButton } from './FormButton';

const meta = preview.meta({
  component: FormButton,
});

export const Primary = meta.story({
  args: {
    children: 'Save changes',
    type: 'button',
  },
});

export const Secondary = meta.story({
  args: {
    children: 'Cancel',
    type: 'button',
    variant: 'secondary',
  },
});

export const Danger = meta.story({
  args: {
    children: 'Delete',
    type: 'button',
    variant: 'danger',
  },
});

export const IconOnly = meta.story({
  args: {
    'aria-label': 'Save',
    type: 'button',
    iconOnly: true,
    children: <Save size={16} aria-hidden />,
  },
});

export const IconOnlyDanger = meta.story({
  args: {
    'aria-label': 'Delete',
    type: 'button',
    iconOnly: true,
    variant: 'danger',
    children: <Trash2 size={16} aria-hidden />,
  },
});

