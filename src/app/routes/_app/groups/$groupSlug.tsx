import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

import { loadGroupDetailBySlug, useGroupDetailBySlug } from '@db/groups';
import { useRequestGroupMembership } from '@db/members';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack } from '@app/components/generic/layout';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';

export const Route = createFileRoute('/_app/groups/$groupSlug')({
  loader: async ({ params }) => {
    const groupDetail = await loadGroupDetailBySlug(params.groupSlug);
    return { groupDetail };
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
  const groupData = useGroupDetailBySlug(groupSlug, { initialData: loaderData.groupDetail });

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
  const groupData = useGroupDetailBySlug(groupSlug, { initialData: loaderData.groupDetail });
  const requestMembership = useRequestGroupMembership();

  const currentUserId = appLoaderData.currentUserId;

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
  const members = groupData.members ?? [];
  const activeMembers = members.filter((entry) => entry.status === 'active');
  const profileByUserId = new Map((groupData.profiles ?? []).map((p) => [p.user_id, p]));
  const ownerProfile = profileByUserId.get(groupData.group.created_by);
  const viewerMembership = members.find((entry) => entry.user_id === currentUserId);
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = membershipStatus === 'none' && !!currentUserId;

  const factions = groupData.factions ?? [];

  return (
    <Stack gap={3}>
      <Card>
        <h2>{groupData.group.name}</h2>
        <p>
          Owner:{' '}
          {ownerProfile?.slug ? (
            <ProfileLink
              slug={ownerProfile.slug}
              username={ownerProfile.username}
              avatar_url={ownerProfile.avatar_url}
            />
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
        {!currentUserId && (
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
              const profile = profileByUserId.get(entry.user_id);
              const label = profile?.username ?? entry.user_id;
              return (
                <li key={entry.id}>
                  {profile?.slug ? (
                    <ProfileLink
                      slug={profile.slug}
                      username={profile.username}
                      avatar_url={profile.avatar_url}
                    />
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
        {factions.length === 0 ? (
          <p>No factions in this group yet.</p>
        ) : (
          <ul>
            {factions.map((faction) => (
              <li key={faction._id}>
                <Link to="/factions/$factionId" params={{ factionId: faction.slug }}>
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
