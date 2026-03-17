import { createFileRoute, Link } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import {
  rulesetsByFactionQueryOptions,
  useRulesetsByFaction,
} from '@db/rulesets';

export const Route = createFileRoute('/_app/factions/$id')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(factionDetailQueryOptions(params.id)),
      context.queryClient.ensureQueryData(
        rulesetsByFactionQueryOptions(params.id)
      ),
    ]);
  },
  component: FactionDetailPage,
});

function FactionDetailPage() {
  const { id } = Route.useParams();
  const faction = useFaction(id);
  const rulesets = useRulesetsByFaction(id);

  if (!faction.data) {
    return null;
  }

  const { data } = faction.data;

  return (
    <>
      <h2>{data.name}</h2>
      <p>{data.description}</p>

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
