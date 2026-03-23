import { createFileRoute, Link, Outlet, useLocation, useMatches } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { useUserGroupMemberships } from '@db/members';
import { currentProfileQueryOptions, useCurrentProfile, useProfilesAll } from '@db/profiles';
import { rulesetsByFactionQueryOptions, useRulesetsByFaction } from '@db/rulesets';

export const Route = createFileRoute('/_app/factions/$factionId')({
  loader: async ({ context, params, location }) => {
    await context.queryClient.ensureQueryData(currentProfileQueryOptions());

    const isSheet = location.pathname.endsWith('/sheet');
    const mode = new URLSearchParams(location.search).get('mode') ?? 'db';

    if (isSheet && mode === 'live') {
      return;
    }

    const faction = await context.queryClient.ensureQueryData(
      factionDetailQueryOptions(params.factionId)
    );

    if (!isSheet) {
      await context.queryClient.ensureQueryData(rulesetsByFactionQueryOptions(faction.id));
    }
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
  const { factionId } = Route.useParams();
  const faction = useFaction(factionId);
  const profile = useCurrentProfile();
  const profiles = useProfilesAll();
  const memberships = useUserGroupMemberships(profile.data?.id);

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
          <Link to="/factions/$factionId/edit" params={{ factionId }}>
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
  const { factionId } = Route.useParams();
  const location = useLocation();
  const matches = useMatches();
  const isSheet = location.pathname.endsWith('/sheet');
  const searchObject =
    location.search && typeof location.search === 'object'
      ? (location.search as Record<string, unknown>)
      : null;
  const sheetModeFromObject = searchObject && typeof searchObject.mode === 'string'
    ? searchObject.mode
    : null;
  const sheetModeFromString = new URLSearchParams(
    typeof location.search === 'string' ? location.search : ''
  ).get('mode');
  const sheetMode = sheetModeFromObject ?? sheetModeFromString ?? 'db';
  const isLiveSheet = isSheet && sheetMode === 'live';

  const faction = useFaction(factionId, { enabled: !isLiveSheet });
  const rulesets = useRulesetsByFaction(faction.data?.id);
  const profile = useCurrentProfile();
  const memberships = useUserGroupMemberships(profile.data?.id);

  const isChildOnlyRoute = matches.some(
    (m) => m.pathname.endsWith('/edit') || m.pathname.endsWith('/sheet')
  );

  if (isLiveSheet) {
    return <Outlet />;
  }

  if (!faction.data) {
    return null;
  }

  if (isChildOnlyRoute) {
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
          <Link to="/factions/$factionId/edit" params={{ factionId }}>
            Edit faction
          </Link>
        </p>
      )}

      <p>
        <Link to="/factions/$factionId/sheet" params={{ factionId }} search={{ mode: 'db' }}>
          Printable faction sheet
        </Link>{' '}
        (opens without site chrome; use the browser print dialog for PDF)
      </p>

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
