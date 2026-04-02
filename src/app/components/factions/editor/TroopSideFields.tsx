import type { Faction } from '@db/factions';
import { FormField } from '@app/components/form/FormField';
import { MultilineTextField } from '@app/components/form/MultilineTextField';
import { OptionPicker } from '@app/components/form/OptionPicker';
import { SuggestField } from '@app/components/form/SuggestField';
import { TextField } from '@app/components/form/TextField';
import { TROOP } from '@game/data/generated';

import styles from './FactionEditor.module.css';
import {
  assetOptionToPreviewSrc,
  NONE_SELECT_VALUE,
  troopOptionToLabel,
} from './factionFormAssetUtils';
import { troopStarOptions } from './factionFormDefaults';
import type { FactionFormApi } from './factionFormTypes';

export function TroopSideFields({
  form,
  troopIndex,
  side,
}: {
  form: FactionFormApi;
  troopIndex: number;
  side: 'front' | 'back';
}) {
  const isBack = side === 'back';
  const idBase = isBack ? `troop-${troopIndex}-back` : `troop-${troopIndex}`;
  const imageLabel = isBack ? 'Back image' : 'Troop image';
  const descriptionLabel = isBack ? 'Back description' : 'Description';
  const starLabel = isBack ? 'Back star modifier' : 'Star modifier';
  const stripedLabel = isBack ? 'Back striped pattern' : 'Striped pattern';

  const i = troopIndex;
  const nameField = isBack ? (`troops[${i}].back.name` as const) : (`troops[${i}].name` as const);
  const imageField = isBack
    ? (`troops[${i}].back.image` as const)
    : (`troops[${i}].image` as const);
  const descField = isBack
    ? (`troops[${i}].back.description` as const)
    : (`troops[${i}].description` as const);
  const starField = isBack ? (`troops[${i}].back.star` as const) : (`troops[${i}].star` as const);
  const stripedField = isBack
    ? (`troops[${i}].back.striped` as const)
    : (`troops[${i}].striped` as const);

  return (
    <div className={styles.troopSideFields}>
      <div className={styles.arrayCardGrid}>
        <form.Field name={nameField}>
          {(field) => (
            <FormField label={isBack ? 'Back name' : 'Name'} htmlFor={`${idBase}-name`}>
              <TextField
                id={`${idBase}-name`}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={imageField}>
          {(field) => (
            <FormField label={imageLabel} htmlFor={`${idBase}-img`}>
              <SuggestField
                id={`${idBase}-img`}
                value={field.state.value ?? ''}
                onChange={(v) => field.handleChange(v as Faction['troops'][number]['image'])}
                options={TROOP.options}
                optionToLabel={troopOptionToLabel}
                optionToPreviewSrc={assetOptionToPreviewSrc}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={descField}>
          {(field) => (
            <FormField label={descriptionLabel} htmlFor={`${idBase}-desc`}>
              <MultilineTextField
                id={`${idBase}-desc`}
                rows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={starField}>
          {(field) => (
            <FormField label={starLabel}>
              <OptionPicker
                ariaLabel={`${starLabel} for troop ${troopIndex + 1}`}
                value={field.state.value ?? NONE_SELECT_VALUE}
                onValueChange={(next) =>
                  field.handleChange(
                    next === NONE_SELECT_VALUE
                      ? undefined
                      : (next as NonNullable<Faction['troops'][number]['star']>)
                  )
                }
                options={troopStarOptions}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name={stripedField}>
          {(field) => (
            <FormField label={stripedLabel} htmlFor={`${idBase}-striped`}>
              <input
                id={`${idBase}-striped`}
                type="checkbox"
                className={styles.checkbox}
                checked={field.state.value === true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked ? true : undefined)}
              />
            </FormField>
          )}
        </form.Field>
      </div>
    </div>
  );
}
