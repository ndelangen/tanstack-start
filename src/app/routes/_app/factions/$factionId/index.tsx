import { createFileRoute, Link, Outlet, useLocation, useMatches } from '@tanstack/react-router';
import { ArrowLeft, Pencil, Printer, UserPlus } from 'lucide-react';

import { loadFaction, useFaction } from '@db/factions';
import { useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import { loadRulesetsByFaction, type RulesetEntry, useRulesetsByFaction } from '@db/rulesets';
import { FormActions } from '@app/components/form/FormActions';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Toolbar } from '@app/components/generic/layout';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { ProfileLink } from '@app/components/profile/ProfileLink';

export const Route = createFileRoute('/_app/factions/$factionId/')({
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
  const loaderData = Route.useLoaderData();
  const factionSeed = loaderData?.faction;
  const { faction, owner, memberships } = useFaction(factionId, { initialData: factionSeed });
  const profile = useCurrentProfile();

  const factionRow = faction;
  const canEdit = canEditFaction(profile.data?._id, owner?._id, faction?.group_id, memberships);
  const myProfileSlug = profile.data?.slug;

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
        {myProfileSlug ? (
          <Link to="/profiles/$slug" params={{ slug: myProfileSlug }}>
            My factions
          </Link>
        ) : (
          <Link to="/auth/login">Log in for my factions</Link>
        )}
        {' · '}
        <Link to="/factions/create" activeProps={{ style: { fontWeight: 'bold' } }}>
          Create a new faction
        </Link>
      </p>
    </div>
  );
}

function FactionRulesetsSection({
  factionDocId,
  rulesetsSeed,
}: {
  factionDocId: string;
  rulesetsSeed: RulesetEntry[] | undefined;
}) {
  const rulesets = useRulesetsByFaction(factionDocId, { initialData: rulesetsSeed });
  if (!rulesets.data || rulesets.data.length === 0) return null;
  return (
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
  );
}

function FactionDetailMain({ factionId }: { factionId: string }) {
  const loaderData = Route.useLoaderData();
  const factionSeed = loaderData?.faction;
  const rulesetsSeed = loaderData?.rulesets;
  const matches = useMatches();

  const { faction, memberships, groupAccess, owner } = useFaction(factionId, {
    initialData: factionSeed,
  });
  const factionRow = faction;
  const profile = useCurrentProfile();
  const requestMembership = useRequestGroupMembership();

  const isChildOnlyRoute = matches.some(
    (m) => m.pathname.endsWith('/edit') || m.pathname.endsWith('/sheet')
  );

  if (!factionRow) {
    return null;
  }

  if (isChildOnlyRoute) {
    return <Outlet />;
  }

  const canEdit = canEditFaction(profile.data?._id, owner?._id, factionRow.group_id, memberships);
  const factionGroupId = factionRow.group_id;

  const profileUserId = profile.data?.user_id;
  const assignedGroup = groupAccess?.group;
  const groupMembersList = groupAccess?.members ?? [];
  const viewerMembership = groupMembersList.find(
    (entry) => entry.membership.user_id === profileUserId
  )?.membership;
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = !!profileUserId && !!assignedGroup && membershipStatus === 'none';

  return (
    <>
      <Toolbar>
        <Toolbar.Left>
          <FormActions>
            <FormTooltip content="Back to factions">
              <UIButton variant="nav" to="/factions" aria-label="Back to factions">
                <ArrowLeft size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </FormActions>
          {canEdit && (
            <FormTooltip content="Edit faction">
              <UIButton
                variant="secondary"
                to="/factions/$factionId/edit"
                params={{ factionId }}
                aria-label="Edit faction"
              >
                <Pencil size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          )}
        </Toolbar.Left>
        <Toolbar.Right>
          <FormTooltip content="Printable faction sheet">
            <UIButton
              variant="nav"
              to="/factions/$factionId/sheet"
              params={{ factionId }}
              search={{ mode: 'db' }}
              target="_blank"
              aria-label="Printable faction sheet"
            >
              <Printer size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
        </Toolbar.Right>
      </Toolbar>

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
        ) : !assignedGroup ? (
          <p>Group details unavailable.</p>
        ) : (
          <>
            <p>
              Group:{' '}
              {assignedGroup.slug ? (
                <Link to="/groups/$groupSlug" params={{ groupSlug: assignedGroup.slug }}>
                  {assignedGroup.name}
                </Link>
              ) : (
                <strong>{assignedGroup.name}</strong>
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
            {!profile.isPending && !profileUserId && (
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
                  onClick={() => requestMembership.mutate(factionGroupId)}
                >
                  <UserPlus size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            )}
            {requestMembership.isError && <p>{requestMembership.error?.message}</p>}
          </>
        )}
      </section>

      {factionRow._id ? (
        <FactionRulesetsSection factionDocId={factionRow._id} rulesetsSeed={rulesetsSeed} />
      ) : null}

      <p>
        <Link to="/factions">Back to factions</Link>
      </p>
    </>
  );
}

function FactionDetailPage() {
  const { factionId } = Route.useParams();
  const location = useLocation();
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

  if (isLiveSheet) {
    return <Outlet />;
  }

  return <FactionDetailMain factionId={factionId} />;
}
