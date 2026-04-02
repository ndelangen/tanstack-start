import type { Faction } from '@db/factions';
import { FormField } from '@app/components/form/FormField';
import { SuggestField } from '@app/components/form/SuggestField';
import { TextField } from '@app/components/form/TextField';
import { LEADERS } from '@game/data/generated';

import { assetOptionToPreviewSrc, leaderOptionToLabel } from './factionFormAssetUtils';
import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionHero({ form }: { form: FactionFormApi }) {
  return (
    <>
      <form.Field name="hero.name">
        {(field) => (
          <FormField label="Hero name" htmlFor="hero-name">
            <TextField
              id="hero-name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="hero.image">
        {(field) => (
          <FormField label="Hero image" htmlFor="hero-image">
            <SuggestField
              id="hero-image"
              value={field.state.value}
              onChange={(v) => field.handleChange(v as Faction['hero']['image'])}
              options={LEADERS.options}
              optionToLabel={leaderOptionToLabel}
              optionToPreviewSrc={assetOptionToPreviewSrc}
            />
          </FormField>
        )}
      </form.Field>
    </>
  );
}
