import { createFileRoute, Link } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';

export const Route = createFileRoute('/_app/factions/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(factionDetailQueryOptions(params.id)),
  component: FactionDetailPage,
});

function FactionDetailPage() {
  const { id } = Route.useParams();
  const faction = useFaction(id);

  if (!faction.data) {
    return null;
  }

  const { data } = faction.data;

  return (
    <>
      <h2>{data.name}</h2>
      <p>{data.description}</p>
      <p>
        <Link to="/factions">Back to factions</Link>
      </p>
    </>
  );
}
