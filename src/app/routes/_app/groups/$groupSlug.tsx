import { createFileRoute, Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

import { factionsByGroupQueryOptions, useFactionsByGroup } from '@db/factions';
import { groupBySlugQueryOptions, useGroupBySlug } from '@db/groups';
import { groupMembersQueryOptions, useGroupMembers, useRequestGroupMembership } from '@db/members';
import {
  currentProfileQueryOptions,
  profilesListQueryOptions,
  useCurrentProfile,
  useProfilesAll,
} from '@db/profiles';
import { FormButton, FormTooltip } from '@app/components/generic/form';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';

export const Route = createFileRoute('/_app/groups/$groupSlug')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(currentProfileQueryOptions());
    await context.queryClient.ensureQueryData(profilesListQueryOptions());
    const group = await context.queryClient.ensureQueryData(
      groupBySlugQueryOptions(params.groupSlug)
    );
    await context.queryClient.ensureQueryData(groupMembersQueryOptions(group.id));
    await context.queryClient.ensureQueryData(factionsByGroupQueryOptions(group.id));
  },
  component: GroupDetailPage,
  staticData: {
    PageHead: GroupPageHead,
  },
});

function GroupPageHead() {
  const { groupSlug } = Route.useParams();
  const group = useGroupBySlug(groupSlug);

  return (
    <div>
      <h1>{group.data?.name ?? 'Group'}</h1>
      <p>
        <Link to="/profiles">Profiles</Link>
      </p>
    </div>
  );
}

function GroupDetailPage() {
  const { groupSlug } = Route.useParams();
  const group = useGroupBySlug(groupSlug);
  const currentProfile = useCurrentProfile();
  const profiles = useProfilesAll();
  const members = useGroupMembers(group.data?.id ?? '');
  const factions = useFactionsByGroup(group.data?.id ?? '');
  const requestMembership = useRequestGroupMembership();

  if (group.isError) {
    return (
      <Card>
        <p>Group not found.</p>
      </Card>
    );
  }

  if (!group.data) {
    return null;
  }

  const groupId = group.data.id;
  const activeMembers = (members.data ?? []).filter((entry) => entry.status === 'active');
  const profileById = new Map((profiles.data ?? []).map((entry) => [entry.id, entry]));
  const ownerProfile = profileById.get(group.data.created_by);
  const viewerMembership = (members.data ?? []).find(
    (entry) => entry.user_id === currentProfile.data?.id
  );
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = membershipStatus === 'none' && !!currentProfile.data?.id;

  return (
    <Stack gap={3}>
      <Card>
        <h2>{group.data.name}</h2>
        <p>
          Owner:{' '}
          {ownerProfile?.slug ? (
            <Link to="/profiles/$slug" params={{ slug: ownerProfile.slug }}>
              {ownerProfile.username ?? ownerProfile.slug}
            </Link>
          ) : (
            (ownerProfile?.username ?? group.data.created_by)
          )}
        </p>
        <p>
          Membership status:{' '}
          {membershipStatus === 'active'
            ? 'Active member'
            : membershipStatus === 'pending'
              ? 'Pending approval'
              : 'Not a member'}
        </p>
        {membershipStatus === 'pending' && <p>Your request is awaiting approval.</p>}
        {!currentProfile.data?.id && (
          <p>
            <Link to="/auth/login">Log in</Link> to request membership.
          </p>
        )}
        {canRequestMembership && (
          <FormTooltip content="Request membership">
            <FormButton
              type="button"
              iconOnly
              aria-label="Request membership"
              disabled={requestMembership.isPending}
              onClick={() => requestMembership.mutate(groupId)}
            >
              <UserPlus size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
        )}
        {requestMembership.isError && <p>{requestMembership.error?.message}</p>}
      </Card>

      <Card>
        <h3>Members</h3>
        {activeMembers.length === 0 ? (
          <p>No active members yet.</p>
        ) : (
          <ul>
            {activeMembers.map((entry) => {
              const profile = profileById.get(entry.user_id);
              const label = profile?.username ?? entry.user_id;
              return (
                <li key={entry.id}>
                  {profile?.slug ? (
                    <Link to="/profiles/$slug" params={{ slug: profile.slug }}>
                      {label}
                    </Link>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h3>Factions</h3>
        {!factions.data || factions.data.length === 0 ? (
          <p>No factions in this group yet.</p>
        ) : (
          <ul>
            {factions.data.map((faction) => (
              <li key={faction.id}>
                <Link to="/factions/$factionId" params={{ factionId: faction.data.slug }}>
                  {faction.data.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Stack>
  );
}
