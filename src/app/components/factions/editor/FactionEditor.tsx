import { useForm } from '@tanstack/react-form';
import { RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { type Faction, useCreateFaction, useDeleteFaction, useUpdateFaction } from '@db/factions';
import { FormActions, FormButton, FormTooltip } from '@app/components/form';
import { schema } from '@data/factions';
import { FactionSchema } from '@game/schema/faction';

import styles from './FactionEditor.module.css';
import { FactionFormFields } from './FactionFormFields';

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
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
              const saved = schema.parse(entry.data);
              baselineRef.current = structuredClone(saved);
              form.reset(structuredClone(saved));
              onSaved?.(entry.id);
            },
          }
        );
      } else if (factionRowId) {
        updateFaction.mutate(
          { id: factionRowId, input: parsed.data },
          {
            onSuccess: (entry) => {
              const saved = schema.parse(entry.data);
              baselineRef.current = structuredClone(saved);
              form.reset(structuredClone(saved));
              onSaved?.(factionRowId);
            },
          }
        );
      }
    },
  });

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
          <FormTooltip content="Save changes">
            <FormButton
              type="button"
              iconOnly
              aria-label="Save changes"
              disabled={saving}
              onClick={() => void form.handleSubmit()}
            >
              <Save size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
          <FormTooltip content="Reset unsaved edits">
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label="Reset unsaved edits"
              disabled={saving}
              onClick={handleReset}
            >
              <RotateCcw size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
          <FormTooltip content="Close editor">
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label="Close editor"
              disabled={saving}
              onClick={onCancel}
            >
              <X size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
          {mode === 'edit' && factionRowId && (
            <FormTooltip content="Delete faction">
              <FormButton
                type="button"
                variant="danger"
                iconOnly
                aria-label="Delete faction"
                disabled={saving}
                onClick={handleDelete}
              >
                <Trash2 size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
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
          <p className={styles.previewHint}>
            No need to make a screenshot: you can click &quot;Save&quot; and share the URL!
          </p>
          <p className={styles.previewTitle}>Preview (JSON)</p>
          <form.Subscribe selector={(s: { values: Faction }) => s.values}>
            {(values: Faction) => (
              <pre className={styles.pre}>{JSON.stringify(values, null, 2)}</pre>
            )}
          </form.Subscribe>
        </aside>
        <div>
          <FactionFormFields form={form} />
        </div>
      </div>
    </div>
  );
}
