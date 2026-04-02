import preview from '@sb/preview';
import { Trash2 } from 'lucide-react';

import { FormButton } from './FormButton';
import { FormUnitToolbar } from './FormUnitToolbar';

const meta = preview.meta({
  component: FormUnitToolbar,
});

export const Default = meta.story({
  args: {
    leading: <span>Item A</span>,
    center: <span>Unit toolbar center text</span>,
    actions: (
      <FormButton type="button" variant="danger" iconOnly aria-label="Remove item">
        <Trash2 size={16} aria-hidden />
      </FormButton>
    ),
  },
});

