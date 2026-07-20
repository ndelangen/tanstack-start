import preview from '@sb/preview';
import { Coins } from 'lucide-react';

import { IconStat } from './IconStat';

const meta = preview.meta({
  component: IconStat,
  args: {
    icon: <Coins size={17} aria-hidden />,
    value: 10,
    label: '10 spice',
  },
});

export const Default = meta.story();
