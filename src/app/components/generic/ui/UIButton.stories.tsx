import preview from '@sb/preview';
import { Save, Trash2 } from 'lucide-react';

import { UIButton } from './UIButton';

const meta = preview.meta({
  component: UIButton,
});

export const Confirm = meta.story({
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

export const Critical = meta.story({
  args: {
    children: 'Delete',
    type: 'button',
    variant: 'critical',
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

export const IconOnlyCritical = meta.story({
  args: {
    'aria-label': 'Delete',
    type: 'button',
    iconOnly: true,
    variant: 'critical',
    children: <Trash2 size={16} aria-hidden />,
  },
});
