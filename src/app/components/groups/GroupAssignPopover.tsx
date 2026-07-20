import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Popover,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { Check, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { UserGroupMembershipWithGroup } from '@db/members';
import { useUserGroupMembershipGroups, useUserGroupMemberships } from '@app/members/db';

export interface GroupAssignPopoverProps {
  disabled: boolean;
  userId: string | null | undefined;
  isUserPending: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
  title?: string;
  descriptionLines?: string[];
  /** When set (including `null`), skips `listByUserActiveWithGroups` and uses this data instead. */
  prefetchedMemberships?: UserGroupMembershipWithGroup[] | null;
}

type BodySharedProps = {
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  disabled: boolean;
  onChangeGroup: (groupId: string | null) => Promise<void>;
  title: string;
  descriptionLines: string[];
  onAssigned: () => void;
};

function GroupAssignPopoverBodyContent({
  memberships,
  isPending,
  selectedGroupId,
  setSelectedGroupId,
  error,
  setError,
  disabled,
  onChangeGroup,
  title,
  descriptionLines,
  onAssigned,
}: BodySharedProps & {
  memberships: UserGroupMembershipWithGroup[] | undefined;
  isPending: boolean;
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const accessibleGroups = useUserGroupMembershipGroups(memberships);
  const memberGroupIdSet = useMemo(
    () => new Set(accessibleGroups.map((group) => String(group.id))),
    [accessibleGroups]
  );
  const groupOptions = useMemo(
    () =>
      accessibleGroups.map((group) => ({
        value: group.id,
        label: `${group.name} (${group.slug})`,
      })),
    [accessibleGroups]
  );

  const handleAssignGroup = async () => {
    const nextGroupId = selectedGroupId || null;
    if (nextGroupId && !memberGroupIdSet.has(nextGroupId)) {
      setError('You can only assign to groups you are an active member of.');
      return;
    }

    setIsAssigning(true);
    setError(null);
    try {
      await onChangeGroup(nextGroupId);
      onAssigned();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to assign group. Please try again.';
      setError(message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={3} size="h4">
          {title}
        </Title>
        {descriptionLines.map((line) => (
          <Text key={line} size="sm" c="dimmed">
            {line}
          </Text>
        ))}
      </Stack>

      {error ? (
        <Alert color="red" title="Group could not be assigned" role="alert">
          {error}
        </Alert>
      ) : null}

      {isPending ? (
        <Center py="md">
          <Loader size="sm" aria-label="Loading groups" />
        </Center>
      ) : groupOptions.length === 0 ? (
        <Text size="sm" c="dimmed">
          No groups are available yet.
        </Text>
      ) : (
        <Stack gap="md">
          <Select
            label="Search groups"
            value={selectedGroupId || null}
            onChange={(value) => setSelectedGroupId(value ?? '')}
            data={groupOptions}
            searchable
            clearable
            placeholder="Type group name or slug…"
            nothingFoundMessage="No matching groups"
            comboboxProps={{ withinPortal: false }}
            disabled={disabled || isAssigning}
          />
          <Group justify="flex-end">
            <Button
              type="button"
              leftSection={<Check size={16} aria-hidden />}
              onClick={() => void handleAssignGroup()}
              disabled={disabled || !selectedGroupId}
              loading={isAssigning}
            >
              Assign selected group
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

function GroupAssignPopoverBodyWithQuery({
  userId,
  ...shared
}: BodySharedProps & { userId: string }) {
  const memberships = useUserGroupMemberships(userId, { initialData: [] });
  return (
    <GroupAssignPopoverBodyContent
      memberships={memberships.data}
      isPending={memberships.isPending}
      {...shared}
    />
  );
}

function GroupAssignPopoverBody({
  userId,
  prefetchedMemberships,
  ...shared
}: BodySharedProps & {
  userId: string;
  prefetchedMemberships?: UserGroupMembershipWithGroup[] | null;
}) {
  if (prefetchedMemberships !== undefined) {
    return (
      <GroupAssignPopoverBodyContent
        memberships={prefetchedMemberships ?? []}
        isPending={false}
        {...shared}
      />
    );
  }

  return <GroupAssignPopoverBodyWithQuery userId={userId} {...shared} />;
}

export function GroupAssignPopover({
  disabled,
  userId,
  isUserPending,
  onChangeGroup,
  title = 'Assign Group',
  descriptionLines = [
    'Groups are used to allow group members to edit this item.',
    'You can create groups on your profile page.',
  ],
  prefetchedMemberships,
}: GroupAssignPopoverProps) {
  const [opened, setOpened] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenedChange = (nextOpened: boolean) => {
    setOpened(nextOpened);
    if (nextOpened) {
      setSelectedGroupId('');
      setError(null);
    }
  };

  return (
    <Popover
      opened={opened}
      onChange={handleOpenedChange}
      position="bottom-start"
      width={340}
      shadow="md"
      withArrow
      trapFocus
      returnFocus
    >
      <Tooltip label="Assign group">
        <Popover.Target>
          <ActionIcon
            type="button"
            variant="light"
            size="lg"
            aria-label="Assign group"
            disabled={disabled}
            onClick={() => setOpened((current) => !current)}
          >
            <Users size={17} aria-hidden />
          </ActionIcon>
        </Popover.Target>
      </Tooltip>
      <Popover.Dropdown>
        {opened && userId ? (
          <GroupAssignPopoverBody
            userId={userId}
            prefetchedMemberships={prefetchedMemberships}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            error={error}
            setError={setError}
            disabled={disabled}
            onChangeGroup={onChangeGroup}
            title={title}
            descriptionLines={descriptionLines}
            onAssigned={() => setOpened(false)}
          />
        ) : opened && isUserPending ? (
          <Center py="md">
            <Loader size="sm" aria-label="Loading account" />
          </Center>
        ) : opened ? (
          <Text size="sm" c="dimmed">
            Sign in to assign a group.
          </Text>
        ) : null}
      </Popover.Dropdown>
    </Popover>
  );
}
