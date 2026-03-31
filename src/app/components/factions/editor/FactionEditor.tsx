import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { type Faction, type FactionEntry } from '@db/factions';
import {
  FactionInputSchema,
  FactionStoredSchema,
  factionSlugBaseFromName,
} from '@game/schema/faction';

import styles from './FactionEditor.module.css';
import { FactionFormFields } from './FactionFormFields';
import { FactionSheetPreviewIframe } from './FactionSheetPreviewIframe';

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

export interface FactionEditorProps {
  initialFaction: Faction;
  factionEntry: FactionEntry;
  onSubmit: (input: Faction) => Promise<{ slug: string }>;
}

export interface FactionEditorHandle {
  submit: () => void;
  resetToInitial: () => void;
  getValues: () => Faction;
}

export const FactionEditor = forwardRef<FactionEditorHandle, FactionEditorProps>(
  ({ initialFaction, factionEntry: _factionEntry, onSubmit }, ref) => {
    const initialValuesRef = useRef(structuredClone(initialFaction));
    const baselineRef = useRef(structuredClone(initialFaction));
    const [parseError, setParseError] = useState<string | null>(null);

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
      onSubmit: async ({ value }) => {
        setParseError(null);
        const parsed = FactionInputSchema.safeParse(value);
        if (!parsed.success) {
          setParseError(formatZodIssues(parsed.error));
          return;
        }

        try {
          const result = await onSubmit(parsed.data);
          const saved = FactionStoredSchema.parse({ ...parsed.data, slug: result.slug });
          const { slug: _ignored, ...savedInput } = saved;
          initialValuesRef.current = structuredClone(savedInput);
          baselineRef.current = structuredClone(savedInput);
          form.reset(structuredClone(savedInput));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to save faction. Please try again.';
          setParseError(message);
        } finally {
          // no-op; saving state is managed by the caller/tooling if needed
        }
      },
    });

    useImperativeHandle(ref, () => ({
      submit: () => {
        void form.handleSubmit();
      },
      resetToInitial: () => {
        setParseError(null);
        form.reset(structuredClone(baselineRef.current));
      },
      getValues: () => form.state.values,
    }));

    const mutationError = null;

    const errors = ([] as string[]).concat(parseError ?? []).concat(mutationError ?? []);

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
