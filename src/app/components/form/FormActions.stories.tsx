import preview from '@sb/preview';

import { UIButton } from '@app/components/generic/ui/UIButton';

import { FormActions } from './FormActions';

const meta = preview.meta({
  component: FormActions,
});

export const Default = meta.story({
  args: {
    children: (
      <FormActions>
        <UIButton type="button">Confirm</UIButton>
        <UIButton type="button" variant="secondary">
          Secondary
        </UIButton>
      </FormActions>
    ),
  },
});
