import preview from '@sb/preview';

import { FormButton } from './FormButton';
import { FormTooltip } from './FormTooltip';

const meta = preview.meta({
  component: FormTooltip,
});

export const Default = meta.story({
  args: {
    content: 'Helpful description for this action.',
    children: <FormButton type="button">Hover me</FormButton>,
  },
});

