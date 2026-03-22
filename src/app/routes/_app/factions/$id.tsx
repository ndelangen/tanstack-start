import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { useUserGroupMemberships } from '@db/members';
import { currentProfileQueryOptions, useCurrentProfile, useProfilesAll } from '@db/profiles';
import { rulesetsByFactionQueryOptions, useRulesetsByFaction } from '@db/rulesets';

export const Route = createFileRoute('/_app/factions/$id')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
      context.queryClient.ensureQueryData(factionDetailQueryOptions(params.id)),
      context.queryClient.ensureQueryData(rulesetsByFactionQueryOptions(params.id)),
    ]);
  },
  component: FactionDetailPage,
  staticData: {
    PageHead: FactionPageHead,
  },
});

function canEditFaction(
  profileId: string | undefined,
  ownerId: string | undefined,
  groupId: string | null | undefined,
  memberships: { group_id: string }[] | undefined
) {
  if (!profileId) return false;
  if (profileId === ownerId) return true;
  if (!groupId) return false;
  return (memberships ?? []).some((m) => m.group_id === groupId);
}

function FactionPageHead() {
  const { id } = Route.useParams();
  const faction = useFaction(id);
  const profile = useCurrentProfile();
  const profiles = useProfilesAll();
  const memberships = useUserGroupMemberships(profile.data?.id ?? '');

  const ownerId = faction.data?.owner_id ?? null;
  const ownerName =
    ownerId == null
      ? null
      : (profiles.data?.find((profile) => profile.id === ownerId)?.username?.trim() ?? ownerId);
  const canEdit = canEditFaction(
    profile.data?.id,
    faction.data?.owner_id,
    faction.data?.group_id,
    memberships.data
  );

  return (
    <div>
      <h1>{faction.data?.data.name ?? 'Faction'}</h1>
      <p>{ownerName ? `Owner: ${ownerName}` : 'Owner: loading...'}</p>
      {canEdit && (
        <p>
          <Link to="/factions/$id/edit" params={{ id }}>
            Edit faction
          </Link>
        </p>
      )}
      <p>
        <Link to="/factions" activeProps={{ style: { fontWeight: 'bold' } }}>
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
  );
}

function FactionDetailPage() {
  const { id } = Route.useParams();
  const matches = useMatches();
  const faction = useFaction(id);
  const rulesets = useRulesetsByFaction(id);
  const profile = useCurrentProfile();
  const memberships = useUserGroupMemberships(profile.data?.id ?? '');

  const isEditRoute = matches.some((m) => m.pathname.endsWith('/edit'));

  if (!faction.data) {
    return null;
  }

  if (isEditRoute) {
    return <Outlet />;
  }

  const canEdit = canEditFaction(
    profile.data?.id,
    faction.data.owner_id,
    faction.data.group_id,
    memberships.data
  );

  return (
    <>
      {/* <FactionSheet {...FactionPreview.sheet.parse(data)} /> */}

      {canEdit && (
        <p>
          <Link to="/factions/$id/edit" params={{ id }}>
            Edit faction
          </Link>
        </p>
      )}

      {rulesets.data && rulesets.data.length > 0 && (
        <section>
          <h3>In rulesets</h3>
          <ul>
            {rulesets.data.map((r) => (
              <li key={r.id}>
                <Link to="/rulesets/$id" params={{ id: String(r.id) }}>
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p>
        <Link to="/factions">Back to factions</Link>
      </p>
    </>
  );
}
