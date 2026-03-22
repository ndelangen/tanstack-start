import { useForm } from '@tanstack/react-form';
import { Copy, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import {
  type Faction,
  type FactionEntry,
  useCreateFaction,
  useDeleteFaction,
  useFactionsAll,
  useUpdateFaction,
} from '@db/factions';
import { useGroupsAll } from '@db/groups';
import { useProfilesAll } from '@db/profiles';
import { FormActions, FormButton, FormPopover, FormTooltip } from '@app/components/form';
import { schema } from '@data/factions';
import { Token as FactionToken } from '@game/assets/faction/token/Token';
import { FactionSchema } from '@game/schema/faction';

import { AssetAutocomplete } from './AssetAutocomplete';
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
  const initialValuesRef = useRef(structuredClone(initialFaction));
  const baselineRef = useRef(structuredClone(initialFaction));
  const [parseError, setParseError] = useState<string | null>(null);
  const [loadPopoverOpen, setLoadPopoverOpen] = useState(false);
  const [loadFactionId, setLoadFactionId] = useState('');

  const createFaction = useCreateFaction();
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();
  const factions = useFactionsAll();
  const profiles = useProfilesAll();
  const groups = useGroupsAll();

  const saving = createFaction.isPending || updateFaction.isPending || deleteFaction.isPending;
  const loadMetaPending = factions.isPending || profiles.isPending || groups.isPending;

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
              initialValuesRef.current = structuredClone(saved);
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
              initialValuesRef.current = structuredClone(saved);
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

  const factionsById = useMemo(
    () => new Map((factions.data ?? []).map((entry) => [entry.id, entry])),
    [factions.data]
  );
  const profileNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const profile of profiles.data ?? []) {
      const label = profile.username?.trim();
      map.set(profile.id, label || profile.id);
    }
    return map;
  }, [profiles.data]);
  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups.data ?? []) {
      map.set(group.id, group.name.trim());
    }
    return map;
  }, [groups.data]);
  const factionLoadOptions = useMemo(
    () =>
      (factions.data ?? [])
        .filter((entry) => entry.data.id !== form.state.values.id)
        .map((entry) => entry.id),
    [factions.data, form.state.values.id]
  );

  const formatOwnerLabel = (entry: FactionEntry) =>
    profileNameById.get(entry.owner_id) ?? entry.owner_id ?? 'Unknown owner';
  const formatGroupLabel = (entry: FactionEntry) =>
    entry.group_id ? (groupNameById.get(entry.group_id) ?? entry.group_id) : 'No group';
  const factionOptionLabel = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    return `${entry.data.name} (${entry.data.id})`;
  };
  const factionOptionSearchText = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    return [
      rowId,
      entry.data.name,
      entry.data.id,
      formatOwnerLabel(entry),
      formatGroupLabel(entry),
    ].join(' ');
  };
  const renderFactionOption = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    return (
      <div className={styles.loadFactionOptionRow}>
        <span className={styles.loadFactionOptionToken} aria-hidden>
          <FactionToken logo={entry.data.logo} background={entry.data.background} />
        </span>
        <span className={styles.loadFactionOptionBody}>
          <span className={styles.loadFactionOptionName}>{entry.data.name}</span>
          <span className={styles.loadFactionOptionMeta}>
            Owner: {formatOwnerLabel(entry)} · Group: {formatGroupLabel(entry)}
          </span>
          <span className={styles.loadFactionOptionMeta}>Token: {entry.data.id}</span>
        </span>
      </div>
    );
  };
  const handleLoadFaction = (rowId: string) => {
    setLoadFactionId(rowId);
    const entry = factionsById.get(rowId);
    if (!entry) return;
    const isNoopLoad = entry.data.id === form.state.values.id;
    if (isNoopLoad) {
      window.alert('The selected faction is already loaded.');
      return;
    }
    const confirmed = window.confirm(
      `Load faction "${entry.data.name}"? Any local unsaved changes will be discarded and replaced.`
    );
    if (!confirmed) {
      return;
    }
    const parsed = FactionSchema.safeParse(entry.data);
    if (!parsed.success) {
      setParseError(formatZodIssues(parsed.error));
      return;
    }
    setParseError(null);
    const loaded = structuredClone(parsed.data);
    initialValuesRef.current = structuredClone(loaded);
    baselineRef.current = structuredClone(loaded);
    form.reset(loaded);
    setLoadPopoverOpen(false);
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
          <FormPopover
            open={loadPopoverOpen}
            onOpenChange={setLoadPopoverOpen}
            align="start"
            side="bottom"
            trigger={
              <FormButton
                type="button"
                variant="secondary"
                iconOnly
                aria-label="Load existing faction"
                disabled={saving || loadMetaPending}
              >
                <Copy size={16} aria-hidden />
              </FormButton>
            }
          >
            <div className={styles.loadFactionPopover}>
              <p className={styles.loadFactionTitle}>Load Existing Faction</p>
              <p className={styles.loadFactionHint}>
                Selecting a faction replaces all unsaved local edits in this editor.
              </p>
              {factions.isPending ? (
                <p className={styles.loadFactionHint}>Loading factions...</p>
              ) : factionLoadOptions.length === 0 ? (
                <p className={styles.loadFactionHint}>
                  No different faction is available to load right now.
                </p>
              ) : (
                <AssetAutocomplete
                  id="faction-load"
                  label="Search factions"
                  value={loadFactionId}
                  onChange={handleLoadFaction}
                  options={factionLoadOptions}
                  optionToLabel={factionOptionLabel}
                  optionToSearchText={factionOptionSearchText}
                  renderOption={renderFactionOption}
                  placeholder="Type name, owner, group, or token..."
                />
              )}
            </div>
          </FormPopover>
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
