import { FormField } from '@app/components/form/FormField';
import { MultilineTextField } from '@app/components/form/MultilineTextField';
import { TextField } from '@app/components/form/TextField';

import type { FactionFormApi } from './factionFormTypes';

export function FactionFormSectionRules({ form }: { form: FactionFormApi }) {
  return (
    <>
      <form.Field name="rules.startText">
        {(field) => (
          <FormField label="Start text" htmlFor="rules-start">
            <MultilineTextField
              id="rules-start"
              rows={3}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="rules.revivalText">
        {(field) => (
          <FormField label="Revival text" htmlFor="rules-revival">
            <MultilineTextField
              id="rules-revival"
              rows={3}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="rules.spiceCount">
        {(field) => (
          <FormField label="Spice count" htmlFor="rules-spice">
            <TextField
              id="rules-spice"
              type="number"
              min={1}
              step={1}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(Number.parseInt(e.target.value, 10) || 1)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="rules.alliance.text">
        {(field) => (
          <FormField label="Alliance text" htmlFor="rules-alliance">
            <MultilineTextField
              id="rules-alliance"
              rows={3}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="rules.fate.title">
        {(field) => (
          <FormField label="Fate title" htmlFor="rules-fate-title">
            <TextField
              id="rules-fate-title"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
      <form.Field name="rules.fate.text">
        {(field) => (
          <FormField label="Fate text" htmlFor="rules-fate-text">
            <MultilineTextField
              id="rules-fate-text"
              rows={2}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>
    </>
  );
}
