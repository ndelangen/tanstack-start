import { Link } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { useMemo, useState } from 'react';

import { type Faction, type FactionEntry, useFactionsAll } from '@db/factions';
import { useGroupsAll } from '@db/groups';
import { useUserGroupMemberships } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormPopover } from '@app/components/form/FormPopover';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { SuggestField } from '@app/components/form/SuggestField';
import { Token as FactionToken } from '@game/assets/faction/token/Token';
import { FactionInputSchema, factionSlugBaseFromName } from '@game/schema/faction';

import styles from './FactionEditor.module.css';

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

export interface FactionLoadPopoverProps {
  disabled: boolean;
  currentValues: Faction;
  onLoaded: (loaded: Faction) => void;
}

export function FactionLoadPopover({ disabled, currentValues, onLoaded }: FactionLoadPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const factions = useFactionsAll();
  const groups = useGroupsAll();
  const currentProfile = useCurrentProfile();
  const memberships = useUserGroupMemberships(currentProfile.data?.id);

  const factionsById = useMemo(
    () => new Map((factions.data ?? []).map((entry) => [entry.id, entry] as const)),
    [factions.data]
  );

  const memberGroupIds = useMemo(
    () => new Set((memberships.data ?? []).map((entry) => String(entry.group_id))),
    [memberships.data]
  );

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups.data ?? []) {
      map.set(group.id, group.name.trim());
    }
    return map;
  }, [groups.data]);

  const formatGroupLabel = (entry: FactionEntry) =>
    entry.group_id ? (groupNameById.get(entry.group_id) ?? entry.group_id) : 'No group';

  const factionLoadOptions = useMemo(
    () =>
      (factions.data ?? [])
        .filter((entry) => entry.data.slug !== factionSlugBaseFromName(currentValues.name ?? ''))
        .map((entry) => entry.id),
    [factions.data, currentValues.name]
  );

  const factionOptionLabel = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    return `${entry.data.name} (${entry.data.slug})`;
  };

  const factionOptionSearchText = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    return [
      rowId,
      entry.data.name,
      entry.data.slug,
      formatGroupLabel(entry),
      entry.owner?.username ?? '',
    ].join(' ');
  };

  const renderFactionOption = (rowId: string) => {
    const entry = factionsById.get(rowId);
    if (!entry) return rowId;
    const groupLabel = formatGroupLabel(entry);
    const ownerLabel = entry.owner?.username ?? entry.owner_id ?? 'Unknown owner';
    const isMember = entry.group_id ? memberGroupIds.has(String(entry.group_id)) : false;

    return (
      <div className={styles.loadFactionOptionRow}>
        <span className={styles.loadFactionOptionToken} aria-hidden>
          <FactionToken logo={entry.data.logo} background={entry.data.background} />
        </span>
        <span className={styles.loadFactionOptionBody}>
          <span className={styles.loadFactionOptionName}>{entry.data.name}</span>
          <span className={styles.loadFactionOptionMeta}>
            Owner: {ownerLabel} · Group: {groupLabel}
            {isMember ? ' (You are a member)' : ''}
          </span>
          <span className={styles.loadFactionOptionMeta}>Slug: {entry.data.slug}</span>
        </span>
      </div>
    );
  };

  const handleSelect = (rowId: string) => {
    setSelectedId(rowId);
    const entry = factionsById.get(rowId);
    if (!entry) return;

    const currentSlug = factionSlugBaseFromName(currentValues.name ?? '');
    const isNoopLoad = entry.data.slug === currentSlug;
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

    const { slug: _ignored, ...inputData } = entry.data;
    const parsed = FactionInputSchema.safeParse(inputData);
    if (!parsed.success) {
      setError(formatZodIssues(parsed.error));
      return;
    }
    setError(null);
    onLoaded(structuredClone(parsed.data));
    setOpen(false);
  };

  return (
    <FormPopover
      open={open}
      onOpenChange={setOpen}
      align="start"
      side="bottom"
      trigger={
        <FormButton
          type="button"
          variant="secondary"
          iconOnly
          aria-label="Load existing faction"
          disabled={disabled || factions.isPending || groups.isPending}
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
        {error && (
          <p className={styles.loadFactionHint} role="alert">
            {error}
          </p>
        )}
        {factions.isPending ? (
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
              optionToLabel={factionOptionLabel}
              optionToSearchText={factionOptionSearchText}
              renderOption={renderFactionOption}
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
    </FormPopover>
  );
}
