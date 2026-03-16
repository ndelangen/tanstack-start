import { createFileRoute, Link } from '@tanstack/react-router';

import { rulesetsListQueryOptions, useRulesetsAll } from '@db/rulesets';

export const Route = createFileRoute('/_app/rulesets/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(rulesetsListQueryOptions()),
  component: RulesetsPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Rulesets</h1>
      </div>
    ),
  },
});

function RulesetsPage() {
  const rulesets = useRulesetsAll();

  return (
    <>
      {rulesets.data && rulesets.data.length > 0 ? (
        <ul>
          {rulesets.data.map((r) => (
            <li key={r.id}>
              <Link to="/rulesets/$name" params={{ name: r.name }}>
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No rulesets yet.</p>
      )}
    </>
  );
}
