import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

import { loadFactionsByGroup, useFactionsByGroup } from '@db/factions';
import { loadGroupBySlug, useGroupBySlug } from '@db/groups';
import { loadGroupMembers, useGroupMembers, useRequestGroupMembership } from '@db/members';
import {
  loadProfilesAll,
  useCurrentProfile,
  useProfilesAll,
} from '@db/profiles';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';

export const Route = createFileRoute('/_app/groups/$groupSlug')({
  loader: async ({ params }) => {
    const [profiles, groupPage] = await Promise.all([
      loadProfilesAll(),
      loadGroupBySlug(params.groupSlug),
    ]);
    const [members, factions] = await Promise.all([
      loadGroupMembers(groupPage.group._id),
      loadFactionsByGroup(groupPage.group._id),
    ]);
    return { profiles, groupPage, members, factions };
  },
  component: GroupDetailPage,
  staticData: {
    PageHead: GroupPageHead,
  },
});

const appRouteApi = getRouteApi('/_app');

function GroupPageHead() {
  const { groupSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const groupData = useGroupBySlug(groupSlug, { initialData: loaderData.groupPage });

  return (
    <div>
      <h1>{groupData.group?.name ?? 'Group'}</h1>
      <p>
        <Link to="/profiles">Profiles</Link>
      </p>
    </div>
  );
}

function GroupDetailPage() {
  const { groupSlug } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const groupData = useGroupBySlug(groupSlug, { initialData: loaderData.groupPage });
  const currentProfile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });
  const profiles = useProfilesAll({ initialData: loaderData.profiles });
  const members = useGroupMembers(groupData.group?._id ?? '', { initialData: loaderData.members });
  const factions = useFactionsByGroup(groupData.group?._id ?? '', {
    initialData: loaderData.factions,
  });
  const requestMembership = useRequestGroupMembership();

  if (groupData.isError) {
    return (
      <Card>
        <p>Group not found.</p>
      </Card>
    );
  }

  if (!groupData.group) {
    return null;
  }

  const groupId = groupData.group._id;
  const activeMembers = (members.data ?? []).filter((entry) => entry.status === 'active');
  const profileById = new Map((profiles.data ?? []).map((entry) => [entry.id, entry]));
  const ownerProfile = profileById.get(groupData.group.created_by);
  const viewerMembership = (members.data ?? []).find(
    (entry) => entry.user_id === currentProfile.data?.id
  );
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = membershipStatus === 'none' && !!currentProfile.data?.id;

  return (
    <Stack gap={3}>
      <Card>
        <h2>{groupData.group.name}</h2>
        <p>
          Owner:{' '}
          {ownerProfile?.slug ? (
            <Link to="/profiles/$slug" params={{ slug: ownerProfile.slug }}>
              {ownerProfile.username ?? ownerProfile.slug}
            </Link>
          ) : (
                    (ownerProfile?.username ?? groupData.group.created_by)
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
            <UIButton
              type="button"
              iconOnly
              aria-label="Request membership"
              disabled={requestMembership.isPending}
              onClick={() => requestMembership.mutate(groupId)}
            >
              <UserPlus size={16} aria-hidden />
            </UIButton>
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
