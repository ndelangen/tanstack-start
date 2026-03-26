import preview from '@sb/preview';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

import { IconButton } from './IconButton';

const meta = preview.meta({
  component: IconButton,
});

export const Confirm = meta.story({
  args: {
    'aria-label': 'Save',
    children: <Save size={16} aria-hidden />,
    variant: 'confirm',
  },
});

export const Secondary = meta.story({
  args: {
    'aria-label': 'Back',
    children: <ArrowLeft size={16} aria-hidden />,
    variant: 'secondary',
  },
});

export const Critical = meta.story({
  args: {
    'aria-label': 'Delete',
    children: <Trash2 size={16} aria-hidden />,
    variant: 'critical',
  },
});

export const NavLink = meta.story({
  args: {
    'aria-label': 'Back to profiles',
    children: <ArrowLeft size={16} aria-hidden />,
    to: '/profiles',
    variant: 'nav',
  },
});
