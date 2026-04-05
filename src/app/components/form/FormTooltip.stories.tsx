import preview from '@sb/preview';

import { UIButton } from '@app/components/generic/ui/UIButton';

import { FormTooltip } from './FormTooltip';

const meta = preview.meta({
  component: FormTooltip,
});

export const Default = meta.story({
  args: {
    content: 'Helpful description for this action.',
    children: <UIButton type="button">Hover me</UIButton>,
  },
});
