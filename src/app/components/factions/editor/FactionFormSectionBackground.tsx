import { Eye } from 'lucide-react';

import { ColorLayerField } from '@app/components/form/ColorLayerField';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormField } from '@app/components/form/FormField';
import { FormPopover } from '@app/components/form/FormPopover';
import { LabeledRangeInput } from '@app/components/form/LabeledRangeInput';
import { TextField } from '@app/components/form/TextField';

import styles from './FactionEditor.module.css';
import { assetPathToPublicUrl, isPreviewableAssetPath } from './factionFormAssetUtils';
import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionBackground({ form }: { form: FactionFormApi }) {
  return (
    <>
      <form.Field name="background.image">
        {(field) => (
          <FormField label="Background texture image" htmlFor="bg-image">
            <div className={styles.assetInputRow}>
              <TextField
                id="bg-image"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {isPreviewableAssetPath(field.state.value) && (
                <FormPopover
                  trigger={
                    <UIButton
                      type="button"
                      variant="secondary"
                      iconOnly
                      aria-label="Preview image"
                    >
                      <Eye size={16} aria-hidden />
                    </UIButton>
                  }
                >
                  <img
                    className={styles.assetPreviewImage}
                    src={assetPathToPublicUrl(field.state.value)}
                    alt=""
                    draggable={false}
                  />
                </FormPopover>
              )}
            </div>
          </FormField>
        )}
      </form.Field>
      <form.Field name="background.colors[0]">
        {(field) => (
          <ColorLayerField
            legend="Background layer A"
            idPrefix="bg-a"
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="background.colors[1]">
        {(field) => (
          <ColorLayerField
            legend="Background layer B"
            idPrefix="bg-b"
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="background.strength">
        {(field) => (
          <LabeledRangeInput
            id="bg-strength"
            label="Background strength (0–1)"
            min={0}
            max={1}
            step={0.01}
            value={field.state.value}
            onChange={field.handleChange}
            formatDisplay={(n) => n.toFixed(2)}
          />
        )}
      </form.Field>
      <form.Field name="background.opacity">
        {(field) => (
          <LabeledRangeInput
            id="bg-opacity"
            label="Background opacity (0–1)"
            min={0}
            max={1}
            step={0.01}
            value={field.state.value}
            onChange={field.handleChange}
            formatDisplay={(n) => n.toFixed(2)}
          />
        )}
      </form.Field>
    </>
  );
}
