import preview from '@sb/preview';

import { FormButton } from './FormButton';
import { FormPopover } from './FormPopover';

const meta = preview.meta({
  component: FormPopover,
});

export const Default = meta.story({
  args: {
    trigger: (
      <FormButton type="button" variant="secondary">
        Open popover
      </FormButton>
    ),
    children: (
      <div style={{ maxWidth: 260 }}>
        <p style={{ marginBottom: 8 }}>Shared popover surface for small forms or previews.</p>
        <p style={{ margin: 0 }}>Use form primitives inside to keep UX consistent.</p>
      </div>
    ),
  },
});

