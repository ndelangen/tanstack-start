import { createFileRoute, Link } from '@tanstack/react-router';

import { factionsListQueryOptions, useFactionsAll } from '@db/factions';

export const Route = createFileRoute('/_app/factions/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(factionsListQueryOptions()),
  component: FactionsPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Factions</h1>
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

function FactionsPage() {
  const factions = useFactionsAll();

  return (
    <>
      {factions.data && factions.data.length > 0 ? (
        <ul>
          {factions.data.map((faction) => (
            <li key={faction.id}>
              <Link to="/factions/$id" params={{ id: faction.id }}>
                {faction.data.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No factions yet.</p>
      )}
    </>
  );
}
