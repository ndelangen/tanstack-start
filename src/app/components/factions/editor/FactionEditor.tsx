import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { Check, Copy, RotateCcw, Save, Trash2, UserMinus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type Faction,
  type FactionEntry,
  useCreateFaction,
  useDeleteFaction,
  useFactionsAll,
  useSetFactionGroup,
  useUpdateFaction,
} from '@db/factions';
import { useGroupsAll } from '@db/groups';
import { useUserGroupMemberships } from '@db/members';
import { useCurrentProfile, useProfilesAll } from '@db/profiles';
import {
  FormActions,
  FormButton,
  FormPopover,
  FormTooltip,
  TypeSuggestPicker,
} from '@app/components/form';
import { Token as FactionToken } from '@game/assets/faction/token/Token';
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
  mode: 'create' | 'edit';
  /** Row UUID when editing */
  factionRowId?: string;
  initialFaction: Faction;
  onCancel: () => void;
  /** Called with public faction slug (`data.slug`, URL slug) after save. */
  onSaved?: (slug: string) => void;
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
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const createFaction = useCreateFaction();
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();
  const setFactionGroup = useSetFactionGroup();
  const factions = useFactionsAll();
  const profiles = useProfilesAll();
  const groups = useGroupsAll();
  const currentProfile = useCurrentProfile();
  const memberships = useUserGroupMemberships(currentProfile.data?.id);

  const saving =
    createFaction.isPending ||
    updateFaction.isPending ||
    deleteFaction.isPending ||
    setFactionGroup.isPending;
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
      const parsed = FactionInputSchema.safeParse(value);
      if (!parsed.success) {
        setParseError(formatZodIssues(parsed.error));
        return;
      }

      if (mode === 'create') {
        createFaction.mutate(
          { input: parsed.data },
          {
            onSuccess: (entry) => {
              const saved = FactionStoredSchema.parse(entry.data);
              const { slug: _ignored, ...savedInput } = saved;
              initialValuesRef.current = structuredClone(savedInput);
              baselineRef.current = structuredClone(savedInput);
              form.reset(structuredClone(savedInput));
              onSaved?.(saved.slug);
            },
          }
        );
      } else if (factionRowId) {
        updateFaction.mutate(
          { id: factionRowId, input: parsed.data },
          {
            onSuccess: (entry) => {
              const saved = FactionStoredSchema.parse(entry.data);
              const { slug: _ignored, ...savedInput } = saved;
              initialValuesRef.current = structuredClone(savedInput);
              baselineRef.current = structuredClone(savedInput);
              form.reset(structuredClone(savedInput));
              onSaved?.(saved.slug);
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
    deleteFaction.mutate(
      { id: factionRowId },
      {
        onSuccess: () => onCancel(),
      }
    );
  };

  const factionsById = useMemo(
    () => new Map((factions.data ?? []).map((entry) => [entry.id, entry])),
    [factions.data]
  );
  const currentFactionEntry = factionRowId ? factionsById.get(factionRowId) : undefined;
  const currentFactionGroupId = currentFactionEntry?.group_id ?? null;
  const isFactionOwner = currentFactionEntry?.owner_id === currentProfile.data?.id;
  const currentGroupEntry = currentFactionGroupId
    ? groups.data?.find((entry) => entry.id === currentFactionGroupId)
    : undefined;
  const memberGroupIds = useMemo(
    () => new Set((memberships.data ?? []).map((entry) => String(entry.group_id))),
    [memberships.data]
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
        .filter((entry) => entry.data.slug !== factionSlugBaseFromName(form.state.values.name))
        .map((entry) => entry.id),
    [factions.data, form.state.values.name]
  );
  const groupOptions = useMemo(() => (groups.data ?? []).map((entry) => entry.id), [groups.data]);

  useEffect(() => {
    if (!groupPopoverOpen) return;
    setSelectedGroupId(currentFactionGroupId ?? '');
  }, [groupPopoverOpen, currentFactionGroupId]);

  const formatOwnerLabel = (entry: FactionEntry) =>
    profileNameById.get(entry.owner_id) ?? entry.owner_id ?? 'Unknown owner';
  const formatGroupLabel = (entry: FactionEntry) =>
    entry.group_id ? (groupNameById.get(entry.group_id) ?? entry.group_id) : 'No group';
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
          <span className={styles.loadFactionOptionMeta}>Slug: {entry.data.slug}</span>
        </span>
      </div>
    );
  };
  const handleLoadFaction = (rowId: string) => {
    setLoadFactionId(rowId);
    const entry = factionsById.get(rowId);
    if (!entry) return;
    const currentSlug = factionSlugBaseFromName(form.state.values.name);
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
  const groupOptionLabel = (groupId: string) => {
    const group = groups.data?.find((entry) => entry.id === groupId);
    return group ? `${group.name} (${group.slug})` : groupId;
  };
  const groupOptionSearchText = (groupId: string) => {
    const group = groups.data?.find((entry) => entry.id === groupId);
    if (!group) return groupId;
    return [groupId, group.name, group.slug].join(' ');
  };
  const renderGroupOption = (groupId: string) => {
    const group = groups.data?.find((entry) => entry.id === groupId);
    if (!group) return groupId;
    const isMember = memberGroupIds.has(group.id);
    return (
      <div className={styles.groupOptionRow}>
        <span className={styles.groupOptionName}>{group.name}</span>
        <span className={styles.groupOptionMeta}>
          Slug: {group.slug} · {isMember ? 'Member' : 'Not a member'}
        </span>
      </div>
    );
  };
  const handleAssignGroup = () => {
    if (!factionRowId || mode !== 'edit') return;
    const nextGroupId = selectedGroupId || null;
    if (nextGroupId === currentFactionGroupId) {
      window.alert('This faction is already assigned to that group.');
      return;
    }
    if (nextGroupId && !memberGroupIds.has(nextGroupId)) {
      window.alert('You can only assign a faction to groups you are an active member of.');
      return;
    }
    setFactionGroup.mutate(
      { id: factionRowId, groupId: nextGroupId },
      {
        onSuccess: () => {
          setGroupPopoverOpen(false);
        },
      }
    );
  };
  const handleRemoveGroup = () => {
    if (!factionRowId || mode !== 'edit') return;
    if (currentFactionGroupId == null) return;
    setFactionGroup.mutate(
      { id: factionRowId, groupId: null },
      {
        onSuccess: () => {
          setSelectedGroupId('');
          setGroupPopoverOpen(false);
        },
      }
    );
  };

  const mutationError =
    createFaction.isError ||
    updateFaction.isError ||
    deleteFaction.isError ||
    setFactionGroup.isError
      ? (createFaction.error ?? updateFaction.error ?? deleteFaction.error ?? setFactionGroup.error)
          ?.message
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
                <TypeSuggestPicker
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
          {mode === 'edit' && factionRowId && isFactionOwner && currentFactionGroupId == null && (
            <FormPopover
              open={groupPopoverOpen}
              onOpenChange={setGroupPopoverOpen}
              align="start"
              side="bottom"
              trigger={
                <FormButton
                  type="button"
                  variant="secondary"
                  iconOnly
                  aria-label="Assign group"
                  disabled={saving || groups.isPending || memberships.isPending}
                >
                  <Users size={16} aria-hidden />
                </FormButton>
              }
            >
              <div className={styles.loadFactionPopover}>
                <p className={styles.loadFactionTitle}>Assign Group</p>
                <p className={styles.loadFactionHint}>
                  Groups are used to allow group members to edit this faction.
                </p>
                <p className={styles.loadFactionHint}>
                  You can create groups on your{' '}
                  {currentProfile.data?.slug ? (
                    <Link to="/profiles/$slug" params={{ slug: currentProfile.data.slug }}>
                      profile page
                    </Link>
                  ) : (
                    'profile page'
                  )}
                  .
                </p>
                <p className={styles.loadFactionHint}>
                  Current group:{' '}
                  {currentFactionGroupId
                    ? (groups.data?.find((entry) => entry.id === currentFactionGroupId)?.name ??
                      currentFactionGroupId)
                    : 'No group'}
                </p>
                {groups.isPending ? (
                  <p className={styles.loadFactionHint}>Loading groups...</p>
                ) : groupOptions.length === 0 ? (
                  <p className={styles.loadFactionHint}>No groups are available yet.</p>
                ) : (
                  <>
                    <TypeSuggestPicker
                      id="faction-group"
                      label="Search groups"
                      value={selectedGroupId}
                      onChange={setSelectedGroupId}
                      options={groupOptions}
                      optionToLabel={groupOptionLabel}
                      optionToSearchText={groupOptionSearchText}
                      renderOption={renderGroupOption}
                      placeholder="Type group name or slug..."
                    />
                    <FormActions>
                      <FormTooltip content="Set selected group">
                        <FormButton
                          type="button"
                          iconOnly
                          aria-label="Set selected group"
                          onClick={handleAssignGroup}
                          disabled={
                            saving ||
                            memberships.isPending ||
                            selectedGroupId.length === 0 ||
                            selectedGroupId === currentFactionGroupId
                          }
                        >
                          <Check size={16} aria-hidden />
                        </FormButton>
                      </FormTooltip>
                    </FormActions>
                  </>
                )}
              </div>
            </FormPopover>
          )}
          {mode === 'edit' && factionRowId && isFactionOwner && currentFactionGroupId != null && (
            <FormTooltip content="Remove group from faction">
              <FormButton
                type="button"
                variant="danger"
                iconOnly
                aria-label="Remove group from faction"
                disabled={saving}
                onClick={handleRemoveGroup}
              >
                <UserMinus size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
          )}
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
        {mode === 'edit' && currentFactionGroupId != null && (
          <div className={styles.toolbarGroupAccess}>
            <span className={styles.groupStatusLabel}>Group acces:</span>{' '}
            {currentGroupEntry?.slug ? (
              <Link to="/groups/$groupSlug" params={{ groupSlug: currentGroupEntry.slug }}>
                {currentGroupEntry.name}
              </Link>
            ) : (
              <span>{currentGroupEntry?.name ?? currentFactionGroupId}</span>
            )}
          </div>
        )}
      </div>

      {(parseError || mutationError) && (
        <div className={styles.errorBanner} role="alert">
          {parseError ?? mutationError}
        </div>
      )}

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
