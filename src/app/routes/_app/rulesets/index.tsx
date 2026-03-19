import { createFileRoute, Link } from '@tanstack/react-router';

import { BlockCover, BlockLink } from '@app/components/block';
import { rulesetsListQueryOptions, useRulesetsAll } from '@db/rulesets';

import styles from './RulesetsIndex.module.css';

export const Route = createFileRoute('/_app/rulesets/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(rulesetsListQueryOptions()),
  component: RulesetsPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Rulesets</h1>
        <p>
          <Link to="/rulesets/create" activeProps={{ style: { fontWeight: 'bold' } }}>
            Create a new ruleset
          </Link>
        </p>
      </div>
    ),
  },
});

function RulesetsPage() {
  const rulesets = useRulesetsAll();

  return (
    <>
      {rulesets.data && rulesets.data.length > 0 ? (
        <div className={styles.grid}>
          {rulesets.data.map((r) => (
            <BlockLink
              key={r.id}
              to="/rulesets/$id"
              params={{ id: String(r.id) }}
              className={styles.card}
            >
              <div className={styles.coverSlot}>
                <BlockCover src={r.image_cover} />
              </div>
              <span className={styles.name}>{r.name}</span>
            </BlockLink>
          ))}
        </div>
      ) : (
        <p>No rulesets yet.</p>
      )}
    </>
  );
}
