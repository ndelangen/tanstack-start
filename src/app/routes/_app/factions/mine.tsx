import { createFileRoute, Link } from '@tanstack/react-router';

import {
  factionsByGroupQueryOptions,
  factionsByOwnerQueryOptions,
  useFactionsByGroup,
  useFactionsByOwner,
} from '@db/factions';
import { userGroupMembershipsQueryOptions, useUserGroupMemberships } from '@db/members';
import { currentProfileQueryOptions, useCurrentProfile } from '@db/profiles';

export const Route = createFileRoute('/_app/factions/mine')({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(currentProfileQueryOptions());

    if (!profile?.id) {
      return;
    }

    await context.queryClient.ensureQueryData(factionsByOwnerQueryOptions(profile.id));
    const memberships = await context.queryClient.ensureQueryData(
      userGroupMembershipsQueryOptions(profile.id)
    );

    for (const m of memberships) {
      await context.queryClient.ensureQueryData(factionsByGroupQueryOptions(m.group_id));
    }
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

function FactionsMinePage() {
  const profile = useCurrentProfile();

  if (!profile.data?.id) {
    return (
      <p>
        <Link to="/auth/login">Log in</Link> to see your factions.
      </p>
    );
  }

  return (
    <>
      <h2>Factions I own</h2>
      <FactionsOwnedList ownerId={profile.data.id} />

      <h2>Factions in my groups</h2>
      <FactionsByGroupsList userId={profile.data.id} />
    </>
  );
}

function FactionsOwnedList({ ownerId }: { ownerId: string }) {
  const factions = useFactionsByOwner(ownerId);

  if (!factions.data || factions.data.length === 0) {
    return <p>You don&apos;t own any factions yet.</p>;
  }

  return (
    <ul>
      {factions.data.map((faction) => (
        <li key={faction.id}>
          <Link to="/factions/$factionId" params={{ factionId: faction.data.id }}>
            {faction.data.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FactionsByGroupsList({ userId }: { userId: string }) {
  const memberships = useUserGroupMemberships(userId);

  if (!memberships.data || memberships.data.length === 0) {
    return <p>You&apos;re not a member of any groups with factions.</p>;
  }

  return (
    <ul>
      {memberships.data.map((m) => (
        <li key={m.group_id}>
          <GroupFactions groupId={m.group_id} groupName={m.groups?.name ?? 'Unknown'} />
        </li>
      ))}
    </ul>
  );
}

function GroupFactions({ groupId, groupName }: { groupId: string; groupName: string }) {
  const factions = useFactionsByGroup(groupId);

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
          <li key={faction.id}>
            <Link to="/factions/$factionId" params={{ factionId: faction.data.id }}>
              {faction.data.name}
            </Link>
          </li>
        ))}
      </ul>
    </span>
  );
}
