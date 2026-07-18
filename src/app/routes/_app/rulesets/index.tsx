import { createFileRoute, Link } from '@tanstack/react-router';

import { loadRulesetsAll, useRulesetsAll } from '@db/rulesets';
import { BlockCover, BlockLink } from '@app/components/generic/surfaces';
import { PageLayout } from '@app/components/shell';

import styles from './RulesetsIndex.module.css';

export const Route = createFileRoute('/_app/rulesets/')({
  loader: async () => ({ rulesets: await loadRulesetsAll() }),
  component: RulesetsPage,
});

function RulesetsPage() {
  const loaderData = Route.useLoaderData();
  const rulesets = useRulesetsAll({ initialData: loaderData.rulesets });

  return (
    <PageLayout
      header={
        <div>
          <h1>Rulesets</h1>
          <p>
            <Link to="/rulesets/create" activeProps={{ style: { fontWeight: 'bold' } }}>
              Create a new ruleset
            </Link>
          </p>
        </div>
      }
    >
      {rulesets.data && rulesets.data.length > 0 ? (
        <div className={styles.grid}>
          {rulesets.data.map((r) => (
            <BlockLink
              key={r.id}
              to="/rulesets/$rulesetSlug"
              params={{ rulesetSlug: r.slug }}
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
    </PageLayout>
  );
}
