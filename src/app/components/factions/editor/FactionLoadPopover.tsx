import { Link } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  type Faction,
  type FactionLoadPickerQuery,
  type FactionLoadPickerRow,
  useFactionLoadPicker,
} from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { FormActions } from '@app/components/form/FormActions';
import { FormField } from '@app/components/form/FormField';
import { FormPopover } from '@app/components/form/FormPopover';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { SuggestField } from '@app/components/form/SuggestField';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FactionInputSchema, factionSlugBaseFromName } from '@game/schema/faction';

import styles from './FactionEditor.module.css';
import {
  FactionLoadOptionRow,
  factionLoadOptionLabel,
  factionLoadOptionSearchText,
  factionLoadOwnerLabel,
} from './FactionLoadPopover.parts';

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

export interface FactionLoadPopoverContentProps {
  currentValues: Faction;
  onLoaded: (loaded: Faction) => void;
}

export function FactionLoadPopoverContent({
  currentValues,
  onLoaded,
}: FactionLoadPopoverContentProps) {
  const picker = useFactionLoadPicker();

  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentProfile = useCurrentProfile();

  const rowsById = useMemo(() => {
    const map = new Map<string, FactionLoadPickerRow>();
    for (const row of picker.data?.rows ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [picker.data?.rows]);

  const memberGroupSet = useMemo(
    () => new Set(picker.data?.memberGroupIds.map(String) ?? []),
    [picker.data?.memberGroupIds]
  );

  const factionLoadOptions = useMemo(() => {
    const slug = factionSlugBaseFromName(currentValues.name ?? '');
    return (picker.data?.rows ?? []).filter((row) => row.data.slug !== slug).map((row) => row.id);
  }, [picker.data?.rows, currentValues.name]);

  const handleSelect = (rowId: string) => {
    setSelectedId(rowId);
    const row = rowsById.get(rowId);
    if (!row) return;

    const currentSlug = factionSlugBaseFromName(currentValues.name ?? '');
    if (row.data.slug === currentSlug) {
      window.alert('The selected faction is already loaded.');
      return;
    }
    const confirmed = window.confirm(
      `Load faction "${row.data.name}"? Any local unsaved changes will be discarded and replaced.`
    );
    if (!confirmed) {
      return;
    }

    const { slug: _ignored, ...inputData } = row.data;
    const parsed = FactionInputSchema.safeParse(inputData);
    if (!parsed.success) {
      setError(formatZodIssues(parsed.error));
      return;
    }
    setError(null);
    onLoaded(structuredClone(parsed.data));
  };

  return (
    <div className={styles.loadFactionPopover}>
      <p className={styles.loadFactionTitle}>Load Existing Faction</p>
      <p className={styles.loadFactionHint}>
        Selecting a faction replaces all unsaved local edits in this editor.
      </p>
      {error && (
        <p className={styles.loadFactionHint} role="alert">
          {error}
        </p>
      )}
      {picker.isPending ? (
        <p className={styles.loadFactionHint}>Loading factions...</p>
      ) : factionLoadOptions.length === 0 ? (
        <p className={styles.loadFactionHint}>
          No different faction is available to load right now.
        </p>
      ) : (
        <FormField label="Search factions" htmlFor="faction-load">
          <SuggestField
            id="faction-load"
            value={selectedId}
            onChange={handleSelect}
            options={factionLoadOptions}
            optionToLabel={(id) => {
              const row = rowsById.get(id);
              return row ? factionLoadOptionLabel(row) : id;
            }}
            optionToSearchText={(id) => {
              const row = rowsById.get(id);
              return row ? factionLoadOptionSearchText(row) : id;
            }}
            renderOption={(id) => {
              const row = rowsById.get(id);
              if (!row) return id;
              const isMember = row.groupId ? memberGroupSet.has(String(row.groupId)) : false;
              return (
                <FactionLoadOptionRow
                  name={row.data.name}
                  slug={row.data.slug}
                  logo={row.data.logo}
                  background={row.data.background}
                  ownerLabel={factionLoadOwnerLabel(row)}
                  groupLabel={row.groupLabel}
                  isMember={isMember}
                />
              );
            }}
            placeholder="Type name, owner, group, or token..."
          />
        </FormField>
      )}
      <FormActions>
        <FormTooltip content="Go to your profile to manage groups and factions">
          <Link to="/profiles/$slug" params={{ slug: currentProfile.data?.slug ?? '' }}>
            Manage on profile
          </Link>
        </FormTooltip>
      </FormActions>
    </div>
  );
}

export interface FactionLoadPopoverProps {
  disabled: boolean;
  currentValues: Faction;
  onLoaded: (loaded: Faction) => void;
}

export function FactionLoadPopover({ disabled, currentValues, onLoaded }: FactionLoadPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormPopover
      open={open}
      onOpenChange={setOpen}
      align="start"
      side="bottom"
      trigger={
        <UIButton
          type="button"
          variant="secondary"
          iconOnly
          aria-label="Load existing faction"
          disabled={disabled}
        >
          <Copy size={16} aria-hidden />
        </UIButton>
      }
    >
      <FactionLoadPopoverContent
        currentValues={currentValues}
        onLoaded={(loaded) => {
          onLoaded(loaded);
          setOpen(false);
        }}
      />
    </FormPopover>
  );
}
