import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import {
  loadFactionsByGroup,
  loadFactionsByOwner,
  useFactionsByGroup,
  useFactionsByOwner,
} from '@db/factions';
import { loadUserGroupMemberships, useUserGroupMemberships } from '@db/members';
import { loadCurrentProfile, useCurrentProfile } from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';

export const Route = createFileRoute('/_app/factions/mine')({
  loader: async () => {
    const profile = await loadCurrentProfile();

    if (!profile?.user_id) {
      return { profile: null, ownedFactions: [], memberships: [], factionsByGroupId: {} };
    }

    const ownedFactions = await loadFactionsByOwner(profile.user_id);
    const memberships = await loadUserGroupMemberships(profile.user_id);
    const factionsByGroupEntries = await Promise.all(
      memberships.map(
        async (membership) =>
          [membership.group_id, await loadFactionsByGroup(membership.group_id)] as const
      )
    );
    const factionsByGroupId: Record<
      string,
      Awaited<ReturnType<typeof loadFactionsByGroup>>
    > = Object.fromEntries(factionsByGroupEntries);

    return { profile, ownedFactions, memberships, factionsByGroupId };
  },
  component: FactionsMinePage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>My Factions</h1>
        <p>
          <Link
            to="/factions"
            activeProps={{ style: { fontWeight: 'bold' } }}
            activeOptions={{ exact: true }}
          >
            All factions
          </Link>
          {' · '}
          <Link to="/factions/mine" activeProps={{ style: { fontWeight: 'bold' } }}>
            My factions
          </Link>
          {' · '}
          <Link to="/factions/create" activeProps={{ style: { fontWeight: 'bold' } }}>
            Create a new faction
          </Link>
        </p>
      </div>
    ),
  },
});

const appRouteApi = getRouteApi('/_app');

function FactionsMinePage() {
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
  });

  if (!profile.data?.user_id) {
    return (
      <p>
        <Link to="/auth/login">Log in</Link> to see your factions.
      </p>
    );
  }

  return (
    <>
      <h2>Factions I own</h2>
      <FactionsOwnedList ownerId={profile.data.user_id} initialFactions={loaderData.ownedFactions} />

      <h2>Factions in my groups</h2>
      <FactionsByGroupsList
        userId={profile.data.user_id}
        initialMemberships={loaderData.memberships}
        initialFactionsByGroupId={loaderData.factionsByGroupId}
      />
    </>
  );
}

function FactionsOwnedList({
  ownerId,
  initialFactions,
}: {
  ownerId: string;
  initialFactions: ReturnType<typeof Route.useLoaderData>['ownedFactions'];
}) {
  const factions = useFactionsByOwner(ownerId, { initialData: initialFactions });

  if (!factions.data || factions.data.length === 0) {
    return <p>You don&apos;t own any factions yet.</p>;
  }

  return <FactionList factions={factions.data} />;
}

function FactionsByGroupsList({
  userId,
  initialMemberships,
  initialFactionsByGroupId,
}: {
  userId: string;
  initialMemberships: ReturnType<typeof Route.useLoaderData>['memberships'];
  initialFactionsByGroupId: ReturnType<typeof Route.useLoaderData>['factionsByGroupId'];
}) {
  const memberships = useUserGroupMemberships(userId, { initialData: initialMemberships });

  if (!memberships.data || memberships.data.length === 0) {
    return <p>You&apos;re not a member of any groups with factions.</p>;
  }

  return (
    <ul>
      {memberships.data.map((m) => (
        <li key={m.group_id}>
          <GroupFactions
            groupId={m.group_id}
            groupName={m.groups?.name ?? 'Unknown'}
            initialFactions={initialFactionsByGroupId[m.group_id]}
          />
        </li>
      ))}
    </ul>
  );
}

function GroupFactions({
  groupId,
  groupName,
  initialFactions,
}: {
  groupId: string;
  groupName: string;
  initialFactions: ReturnType<typeof Route.useLoaderData>['ownedFactions'];
}) {
  const factions = useFactionsByGroup(groupId, { initialData: initialFactions });

  if (!factions.data || factions.data.length === 0) {
    return (
      <span>
        <strong>{groupName}</strong>: No factions.
      </span>
    );
  }

  return (
    <span>
      <strong>{groupName}</strong>:
      <ul>
        {factions.data.map((faction) => (
          <li key={faction._id}>
            <Link to="/factions/$factionId" params={{ factionId: faction.slug }}>
              {faction.data.name}
            </Link>
          </li>
        ))}
      </ul>
    </span>
  );
}
