import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';

import { type Faction, useCreateFaction, useDeleteFaction, useUpdateFaction } from '@db/factions';
import { FormActions, FormButton } from '@app/components/form';
import { FactionSchema } from '@game/schema/faction';

import styles from './FactionEditor.module.css';
import { type FactionFormApi, FactionFormFields } from './FactionFormFields';

function formatZodIssues(err: {
  issues: readonly { path: (string | number)[]; message: string }[];
}) {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

export interface FactionEditorProps {
  mode: 'create' | 'edit';
  /** Row UUID when editing */
  factionRowId?: string;
  initialFaction: Faction;
  onCancel: () => void;
  onSaved?: (rowId: string) => void;
}

export function FactionEditor({
  mode,
  factionRowId,
  initialFaction,
  onCancel,
  onSaved,
}: FactionEditorProps) {
  const baselineRef = useRef(structuredClone(initialFaction));
  const [parseError, setParseError] = useState<string | null>(null);

  const createFaction = useCreateFaction();
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();

  const saving = createFaction.isPending || updateFaction.isPending || deleteFaction.isPending;

  const form = useForm({
    defaultValues: initialFaction,
    onSubmit: async ({ value }) => {
      setParseError(null);
      const parsed = FactionSchema.safeParse(value);
      if (!parsed.success) {
        setParseError(formatZodIssues(parsed.error));
        return;
      }

      if (mode === 'create') {
        createFaction.mutate(
          { input: parsed.data },
          {
            onSuccess: (entry) => {
              baselineRef.current = structuredClone(parsed.data);
              form.reset(structuredClone(parsed.data));
              onSaved?.(entry.id);
            },
          }
        );
      } else if (factionRowId) {
        updateFaction.mutate(
          { id: factionRowId, input: parsed.data },
          {
            onSuccess: () => {
              baselineRef.current = structuredClone(parsed.data);
              form.reset(structuredClone(parsed.data));
              onSaved?.(factionRowId);
            },
          }
        );
      }
    },
  }) as FactionFormApi;

  const handleReset = () => {
    setParseError(null);
    form.reset(structuredClone(baselineRef.current));
  };

  const handleDelete = () => {
    if (!factionRowId || mode !== 'edit') return;
    if (!window.confirm('Delete this faction? It will be hidden from lists.')) return;
    deleteFaction.mutate(factionRowId, {
      onSuccess: () => onCancel(),
    });
  };

  const mutationError =
    createFaction.isError || updateFaction.isError || deleteFaction.isError
      ? (createFaction.error ?? updateFaction.error ?? deleteFaction.error)?.message
      : null;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <FormActions>
          <FormButton type="button" disabled={saving} onClick={() => void form.handleSubmit()}>
            {saving ? 'Saving…' : 'Save'}
          </FormButton>
          <FormButton type="button" variant="secondary" disabled={saving} onClick={handleReset}>
            Reset
          </FormButton>
          <FormButton type="button" variant="secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </FormButton>
          {mode === 'edit' && factionRowId && (
            <FormButton type="button" variant="danger" disabled={saving} onClick={handleDelete}>
              {deleteFaction.isPending ? 'Deleting…' : 'Delete'}
            </FormButton>
          )}
        </FormActions>
      </div>

      {(parseError || mutationError) && (
        <div className={styles.errorBanner} role="alert">
          {parseError ?? mutationError}
        </div>
      )}

      <div className={styles.body}>
        <aside className={styles.preview}>
          <p className={styles.previewTitle}>Preview (JSON)</p>
          <form.Subscribe selector={(s) => s.values}>
            {(values) => <pre className={styles.pre}>{JSON.stringify(values, null, 2)}</pre>}
          </form.Subscribe>
        </aside>
        <div>
          <FactionFormFields form={form} />
        </div>
      </div>
    </div>
  );
}
