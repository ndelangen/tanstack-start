import {
  createFileRoute,
  getRouteApi,
  Link,
  Outlet,
  useLocation,
  useMatches,
} from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

import { loadFaction, loadFactionBySlug, useFaction } from '@db/factions';
import { useGroup } from '@db/groups';
import { useGroupMembers, useRequestGroupMembership, useUserGroupMemberships } from '@db/members';
import { useCurrentProfile, useProfilesAll } from '@db/profiles';
import { loadRulesetsByFaction, useRulesetsByFaction } from '@db/rulesets';
import { FormButton } from '@app/components/form/FormButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { ProfileLink } from '@app/components/profile/ProfileLink';

export const Route = createFileRoute('/_app/factions/$factionId')({
  loader: async ({ params, location }) => {
    const isSheet = location.pathname.endsWith('/sheet');
    const mode = new URLSearchParams(location.search).get('mode') ?? 'db';

    if (isSheet && mode === 'live') {
      return { faction: undefined, rulesets: [] };
    }

    const faction = await loadFaction(params.factionId);
    const rulesets = isSheet ? [] : await loadRulesetsByFaction(faction.faction._id);

    return { faction, rulesets };
  },
  component: FactionDetailPage,
  staticData: {
    PageHead: FactionPageHead,
  },
});

const appRouteApi = getRouteApi('/_app');

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
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const factionSeed = loaderData?.faction;
  const { faction, owner, memberships } = useFaction(factionId, { initialData: factionSeed });
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });

  const factionRow = faction;
  const canEdit = canEditFaction(profile.data?._id, owner?._id, faction?.group_id, memberships);

  return (
    <div>
      <h1>{factionRow?.data.name ?? 'Faction'}</h1>
      <p>Owner: {owner ? <ProfileLink {...owner} /> : <span>Loading owner...</span>}</p>
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
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const factionSeed = loaderData?.faction;
  const rulesetsSeed = loaderData?.rulesets;
  const location = useLocation();
  const matches = useMatches();
  const isSheet = location.pathname.endsWith('/sheet');
  const searchObject =
    location.search && typeof location.search === 'object'
      ? (location.search as Record<string, unknown>)
      : null;
  const sheetModeFromObject =
    searchObject && typeof searchObject.mode === 'string' ? searchObject.mode : null;
  const sheetModeFromString = new URLSearchParams(
    typeof location.search === 'string' ? location.search : ''
  ).get('mode');
  const sheetMode = sheetModeFromObject ?? sheetModeFromString ?? 'db';
  const isLiveSheet = isSheet && sheetMode === 'live';

  const { faction, owner, group, memberships } = useFaction(factionId, {
    enabled: !isLiveSheet,
    initialData: factionSeed,
  });
  const factionRow = faction;
  const rulesets = useRulesetsByFaction(factionRow?._id, { initialData: rulesetsSeed });
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });
  const groupMembers = useGroupMembers(factionRow?.group_id ?? '');
  const requestMembership = useRequestGroupMembership();

  const isChildOnlyRoute = matches.some(
    (m) => m.pathname.endsWith('/edit') || m.pathname.endsWith('/sheet')
  );

  if (isLiveSheet) {
    return <Outlet />;
  }

  if (!factionRow) {
    return null;
  }

  if (isChildOnlyRoute) {
    return <Outlet />;
  }

  const canEdit = canEditFaction(
    profile.data?._id,
    factionRow.owner_id,
    factionRow.group_id,
    memberships
  );
  const viewerMembership = groupMembers.data?.find(
    (entry) => entry.user_id === profile.data?.user_id
  );
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const factionGroupId = factionRow.group_id;
  const canRequestMembership =
    factionGroupId != null && !!profile.data?._id && membershipStatus === 'none';

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

      <section>
        <h3>Group</h3>
        {factionGroupId == null ? (
          <p>This faction is not assigned to a group.</p>
        ) : (
          <>
            <p>
              Group:{' '}
              {membershipStatus === 'active' && group?.slug ? (
                <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
                  {group.name}
                </Link>
              ) : (
                <strong>{group?.name ?? 'Loading group...'}</strong>
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
            {membershipStatus === 'pending' && (
              <p>Your membership request is waiting for approval.</p>
            )}
            {!profile.isPending && !profile.data?.user_id && (
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
                  onClick={() => requestMembership.mutate(factionGroupId)}
                >
                  <UserPlus size={16} aria-hidden />
                </FormButton>
              </FormTooltip>
            )}
            {requestMembership.isError && <p>{requestMembership.error?.message}</p>}
          </>
        )}
      </section>

      {rulesets.data && rulesets.data.length > 0 && (
        <section>
          <h3>In rulesets</h3>
          <ul>
            {rulesets.data.map((r) => (
              <li key={r.id}>
                <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug: r.slug }}>
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
