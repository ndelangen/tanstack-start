import { FormTooltip } from '@app/components/form/FormTooltip';
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';

export interface FactionGroupPopoverProps {
  disabled: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
}

export function FactionGroupPopover({ onChangeGroup, disabled }: FactionGroupPopoverProps) {
  return (
    <FormTooltip content="Assign group">
      <div>
        <GroupAssignPopover
          disabled={disabled}
          onChangeGroup={onChangeGroup}
          title="Assign Group"
          descriptionLines={[
            'Groups are used to allow group members to edit this faction.',
            'You can create groups on your profile page.',
          ]}
        />
      </div>
    </FormTooltip>
  );
}
