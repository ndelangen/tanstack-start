import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { rulesetsByFactionQueryOptions, useRulesetsByFaction } from '@db/rulesets';
import { FactionSheet } from '@game/assets/faction/sheet/Sheet';
import { FactionPreview } from '@game/schema/faction';

export const Route = createFileRoute('/_app/factions/$id')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(factionDetailQueryOptions(params.id)),
      context.queryClient.ensureQueryData(rulesetsByFactionQueryOptions(params.id)),
    ]);
  },
  component: FactionDetailPage,
});

function FactionDetailPage() {
  const { id } = Route.useParams();
  const matches = useMatches();
  const faction = useFaction(id);
  const rulesets = useRulesetsByFaction(id);
  const profile = useCurrentProfile();

  const isEditRoute = matches.some((m) => m.pathname.endsWith('/edit'));

  if (!faction.data) {
    return null;
  }

  if (isEditRoute) {
    return <Outlet />;
  }

  const { data } = faction.data;
  const isOwner = profile?.data?.id === faction.data.owner_id;

  return (
    <>
      <FactionSheet {...FactionPreview.sheet.parse(data)} />

      {isOwner && (
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
