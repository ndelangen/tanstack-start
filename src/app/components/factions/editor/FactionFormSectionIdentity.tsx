import type { Faction } from '@db/factions';
import { FormField } from '@app/components/form/FormField';
import { HexColorPicker } from '@app/components/form/HexColorPicker';
import { SuggestField } from '@app/components/form/SuggestField';
import { TextField } from '@app/components/form/TextField';

import styles from './FactionEditor.module.css';
import { assetOptionToPreviewSrc, logoOptions, logoOptionToLabel } from './factionFormAssetUtils';
import type { FactionFormApi } from './factionFormTypes';
import { TtsColorsEditor } from './TtsColorsEditor';

export function FactionFormSectionIdentity({ form }: { form: FactionFormApi }) {
  return (
    <>
      <form.Field name="name">
        {(field) => (
          <>
            <FormField label="Display name" htmlFor="faction-name">
              <TextField
                id="faction-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormField>
            <p className={styles.ttsHint}>
              The display name sets your faction&apos;s public slug, which appears in the shareable
              URL. If you rename an existing faction, that slug (and the URL) can change, so older
              links may break—including bookmarks, pasted links, and references in Tabletop
              Simulator.
            </p>
          </>
        )}
      </form.Field>
      <form.Field name="logo">
        {(field) => (
          <FormField label="Logo" htmlFor="faction-logo">
            <SuggestField
              id="faction-logo"
              value={field.state.value}
              onChange={(v) => field.handleChange(v as Faction['logo'])}
              options={logoOptions}
              optionToLabel={logoOptionToLabel}
              optionToPreviewSrc={assetOptionToPreviewSrc}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="themeColor">
        {(field) => (
          <FormField label="Theme color (#rrggbb)" htmlFor="faction-theme-text">
            <HexColorPicker
              pickerId="faction-theme-picker"
              textId="faction-theme-text"
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              onBlur={field.handleBlur}
              pickerAriaLabel="Pick theme color"
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="colors">
        {(field) => <TtsColorsEditor value={field.state.value} onChange={field.handleChange} />}
      </form.Field>
    </>
  );
}
