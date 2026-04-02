import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import { type Faction, type FactionEntry } from '@db/factions';
import { FactionStoredSchema, factionSlugBaseFromName } from '@game/schema/faction';

import styles from './FactionEditor.module.css';
import { FactionFormFields } from './FactionFormFields';
import { FactionSheetPreviewIframe } from './FactionSheetPreviewIframe';

export interface FactionEditorProps {
  factionEntry: FactionEntry;
  errors: string[];
  onSubmit?: (values: Faction) => void;
}

export interface FactionEditorHandle {
  submit: () => void;
  resetToInitial: () => void;
  getValues: () => Faction;
}

export const FactionEditor = forwardRef<FactionEditorHandle, FactionEditorProps>(
  ({ factionEntry, errors, onSubmit }, ref) => {
    const stored = FactionStoredSchema.parse(factionEntry.data);
    const { slug: _ignored, ...initialInput } = stored;
    const initialValuesRef = useRef<Faction>(structuredClone(initialInput));
    const baselineRef = useRef<Faction>(structuredClone(initialInput));

    const form = useForm<
      Faction,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    >({
      defaultValues: initialValuesRef.current,
      onSubmit: ({ value }) => {
        onSubmit?.(value);
      },
    });

    useImperativeHandle(ref, () => ({
      submit: () => {
        void form.handleSubmit();
      },
      resetToInitial: () => {
        form.reset(structuredClone(baselineRef.current));
      },
      getValues: () => form.state.values,
    }));

    return (
      <div className={styles.root}>
        {errors.map((error) => (
          <div className={styles.errorBanner} role="alert" key={error}>
            {error}
          </div>
        ))}

        <div className={styles.body}>
          <aside className={styles.preview}>
            <p className={styles.previewHint}>
              Sheet updates as you edit (unsaved). Save and share the faction URL when ready.
            </p>
            <form.Subscribe selector={(s: { values: Faction }) => s.values.name}>
              {(slug) => (
                <p className={styles.previewHint}>
                  <Link
                    to="/factions/$factionId/sheet"
                    params={{ factionId: factionSlugBaseFromName(slug) }}
                    search={{ mode: 'live' }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open sheet in new tab
                  </Link>
                </p>
              )}
            </form.Subscribe>
            <p className={styles.previewTitle}>Sheet preview</p>
            <form.Subscribe selector={(s: { values: Faction }) => s.values}>
              {(values: Faction) => <FactionSheetPreviewIframe faction={values} />}
            </form.Subscribe>
          </aside>
          <div>
            <FactionFormFields form={form} />
          </div>
        </div>
      </div>
    );
  }
);
