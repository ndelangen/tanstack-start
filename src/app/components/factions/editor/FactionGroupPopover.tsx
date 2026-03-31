import { useState, useMemo } from 'react';

import { useGroupsAll } from '@app/groups/db';
import { useUserGroupMemberships } from '@app/members/db';
import { useCurrentProfile } from '@db/profiles';
import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormPopover } from '@app/components/form/FormPopover';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { SuggestField } from '@app/components/form/SuggestField';
import { Users, Check } from 'lucide-react';

import styles from './FactionEditor.module.css';

export interface FactionGroupPopoverProps {
  disabled: boolean;
  currentGroupId: string | null;
  canAssignGroup: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
}

export function FactionGroupPopover({
  disabled,
  currentGroupId,
  canAssignGroup,
  onChangeGroup,
}: FactionGroupPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useCurrentProfile();
  const userId = profile.data?.id;

  // Only enable heavy queries once the popover is open and we know the user.
  const shouldFetch = open && Boolean(userId);

  const groups = useGroupsAll(shouldFetch ? undefined : { initialData: [] });
  const memberships = useUserGroupMemberships(shouldFetch ? userId : undefined, {
    initialData: [],
  });

  const memberGroupIdSet = useMemo(
    () => new Set((memberships.data ?? []).map((entry) => String(entry.group_id))),
    [memberships.data],
  );

  const groupOptions = useMemo(
    () => (groups.data ?? []).map((entry) => entry.id),
    [groups.data],
  );

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
    const isMember = memberGroupIdSet.has(group.id);
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
    if (!canAssignGroup || !onChangeGroup) return;
    const nextGroupId = selectedGroupId || null;
    if (nextGroupId === currentGroupId) {
      window.alert('This faction is already assigned to that group.');
      return;
    }
    if (nextGroupId && !memberGroupIdSet.has(nextGroupId)) {
      window.alert('You can only assign a faction to groups you are an active member of.');
      return;
    }
    void (async () => {
      setSaving(true);
      try {
        await onChangeGroup(nextGroupId);
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to assign group. Please try again.';
        setError(message);
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleRemoveGroup = () => {
    if (!canAssignGroup || !onChangeGroup) return;
    if (currentGroupId == null) return;
    void (async () => {
      setSaving(true);
      try {
        await onChangeGroup(null);
        setSelectedGroupId('');
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove group. Please try again.';
        setError(message);
      } finally {
        setSaving(false);
      }
    })();
  };

  const isBusy = disabled || saving || groups.isPending || memberships.isPending;

  return (
    <>
      <FormPopover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setSelectedGroupId(currentGroupId ?? '');
            setError(null);
          }
        }}
        align="start"
        side="bottom"
        trigger={
          <FormButton
            type="button"
            variant="secondary"
            iconOnly
            aria-label="Assign group"
            disabled={isBusy || !canAssignGroup}
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
          <p className={styles.loadFactionHint}>You can create groups on your profile page.</p>
          <p className={styles.loadFactionHint}>
            Current group: {currentGroupId ?? 'No group'}
          </p>
          {error && (
            <p className={styles.loadFactionHint} role="alert">
              {error}
            </p>
          )}
          {groups.isPending ? (
            <p className={styles.loadFactionHint}>Loading groups...</p>
          ) : groupOptions.length === 0 ? (
            <p className={styles.loadFactionHint}>No groups are available yet.</p>
          ) : (
            <>
              <FormField label="Search groups" htmlFor="faction-group">
                <SuggestField
                  id="faction-group"
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  options={groupOptions}
                  optionToLabel={groupOptionLabel}
                  optionToSearchText={groupOptionSearchText}
                  renderOption={renderGroupOption}
                  placeholder="Type group name or slug..."
                />
              </FormField>
              <FormActions>
                <FormTooltip content="Set selected group">
                  <FormButton
                    type="button"
                    iconOnly
                    aria-label="Set selected group"
                    onClick={handleAssignGroup}
                    disabled={
                      saving ||
                      selectedGroupId.length === 0 ||
                      selectedGroupId === currentGroupId
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
      {currentGroupId != null && (
        <FormTooltip content="Remove group from faction">
          <FormButton
            type="button"
            variant="danger"
            iconOnly
            aria-label="Remove group from faction"
            disabled={isBusy || !canAssignGroup}
            onClick={handleRemoveGroup}
          >
            <Users size={16} aria-hidden />
          </FormButton>
        </FormTooltip>
      )}
    </>
  );
}

