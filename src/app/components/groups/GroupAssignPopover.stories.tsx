import preview from '@sb/preview';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { UserGroupMembershipWithGroup } from '@db/members';

import { GroupAssignPopover } from './GroupAssignPopover';

const availableMemberships = [
  {
    _id: 'membership-1',
    id: 'membership-1',
    _creationTime: Date.parse('2026-07-18T10:00:00.000Z'),
    group_id: 'group-1',
    user_id: 'user-1',
    status: 'active',
    requested_at: '2026-07-18T10:00:00.000Z',
    approved_at: '2026-07-18T10:05:00.000Z',
    approved_by: 'user-2',
    groups: {
      id: 'group-1',
      name: 'Arrakeen Rules Council',
      slug: 'arrakeen-rules-council',
    },
  },
] as unknown as UserGroupMembershipWithGroup[];

const meta = preview.meta({
  component: GroupAssignPopover,
  parameters: {
    layout: 'centered',
  },
  args: {
    disabled: false,
    userId: 'user-1',
    isUserPending: false,
    onChangeGroup: fn(async () => undefined),
    prefetchedMemberships: availableMemberships,
  },
});

export const AvailableGroups = meta.story({
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = page.getByRole('button', { name: 'Assign group' });

    await userEvent.click(trigger);

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabelText('Search groups')).toBeVisible();
  },
});

export const NoAvailableGroups = meta.story({
  args: {
    prefetchedMemberships: [],
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: 'Assign group' }));
    await expect(page.getByText('No groups are available yet.')).toBeVisible();
  },
});

export const Disabled = meta.story({
  args: {
    disabled: true,
  },
});
