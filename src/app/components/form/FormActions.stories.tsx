import preview from '@sb/preview';

import { FormActions } from './FormActions';
import { FormButton } from './FormButton';

const meta = preview.meta({
  component: FormActions,
});

export const Default = meta.story({
  args: {
    children: (
      <FormActions>
        <FormButton type="button">Primary</FormButton>
        <FormButton type="button" variant="secondary">
          Secondary
        </FormButton>
      </FormActions>
    ),
  },
});

