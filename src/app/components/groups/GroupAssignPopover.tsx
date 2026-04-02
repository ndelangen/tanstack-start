import { Check, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormPopover } from '@app/components/form/FormPopover';
import { SuggestField } from '@app/components/form/SuggestField';
import { useCurrentUserMemberships } from '@app/members/db';

import styles from '../factions/editor/FactionEditor.module.css';

export interface GroupAssignPopoverProps {
  disabled: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
  title?: string;
  descriptionLines?: string[];
}

export function GroupAssignPopover({
  disabled,
  onChangeGroup,
  title = 'Assign Group',
  descriptionLines = [
    'Groups are used to allow group members to edit this item.',
    'You can create groups on your profile page.',
  ],
}: GroupAssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const memberships = useCurrentUserMemberships({ enabled: open });
  const accessibleGroups = memberships.groups;

  const memberGroupIdSet = useMemo(
    () => new Set(accessibleGroups.map((group) => String(group.id))),
    [accessibleGroups]
  );

  const groupOptions = useMemo(
    () => accessibleGroups.map((group) => group.id),
    [accessibleGroups]
  );

  const groupOptionLabel = (groupId: string) => {
    const group = accessibleGroups.find((entry) => entry.id === groupId);
    return group ? `${group.name} (${group.slug})` : groupId;
  };

  const groupOptionSearchText = (groupId: string) => {
    const group = accessibleGroups.find((entry) => entry.id === groupId);
    if (!group) return groupId;
    return [groupId, group.name, group.slug].join(' ');
  };

  const renderGroupOption = (groupId: string) => {
    const group = accessibleGroups.find((entry) => entry.id === groupId);
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
    const nextGroupId = selectedGroupId || null;
    if (nextGroupId && !memberGroupIdSet.has(nextGroupId)) {
      window.alert('You can only assign to groups you are an active member of.');
      return;
    }
    void (async () => {
      try {
        await onChangeGroup(nextGroupId);
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to assign group. Please try again.';
        setError(message);
      }
    })();
  };

  return (
    <FormPopover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSelectedGroupId('');
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
          disabled={disabled}
        >
          <Users size={16} aria-hidden />
        </FormButton>
      }
    >
      <div className={styles.loadFactionPopover}>
        <p className={styles.loadFactionTitle}>{title}</p>
        {descriptionLines.map((line) => (
          <p key={line} className={styles.loadFactionHint}>
            {line}
          </p>
        ))}
        {error && (
          <p className={styles.loadFactionHint} role="alert">
            {error}
          </p>
        )}
        {memberships.isPending ? (
          <p className={styles.loadFactionHint}>Loading groups...</p>
        ) : groupOptions.length === 0 ? (
          <p className={styles.loadFactionHint}>No groups are available yet.</p>
        ) : (
          <>
            <FormField label="Search groups" htmlFor="entity-group">
              <SuggestField
                id="entity-group"
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
              <FormButton
                type="button"
                iconOnly
                aria-label="Set selected group"
                onClick={handleAssignGroup}
                disabled={disabled}
              >
                <Check size={16} aria-hidden />
              </FormButton>
            </FormActions>
          </>
        )}
      </div>
    </FormPopover>
  );
}

