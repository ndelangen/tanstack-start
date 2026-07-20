import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';

export interface FactionGroupPopoverProps {
  disabled: boolean;
  userId: string | null | undefined;
  isUserPending: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
}

export function FactionGroupPopover({
  onChangeGroup,
  disabled,
  userId,
  isUserPending,
}: FactionGroupPopoverProps) {
  return (
    <GroupAssignPopover
      disabled={disabled}
      userId={userId}
      isUserPending={isUserPending}
      onChangeGroup={onChangeGroup}
      title="Assign Group"
      descriptionLines={[
        'Groups are used to allow group members to edit this faction.',
        'You can create groups on your profile page.',
      ]}
    />
  );
}
