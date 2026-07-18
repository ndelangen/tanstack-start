import { createFileRoute, Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';

import { loadFactionsAll, useFactionsAll } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { Toolbar, ToolbarSearchField } from '@app/components/generic/layout';
import { PageLayout } from '@app/components/shell';

import styles from './FactionsIndex.module.css';

export const Route = createFileRoute('/_app/factions/')({
  loader: async () => ({ factions: await loadFactionsAll() }),
  component: FactionsPage,
});

function FactionsPage() {
  const loaderData = Route.useLoaderData();
  const factions = useFactionsAll({ initialData: loaderData.factions });
  const profile = useCurrentProfile();
  const [searchQuery, setSearchQuery] = useState('');

  const list = factions.data ?? [];

  const fuse = useMemo(
    () =>
      new Fuse(list, {
        keys: ['data.name', 'slug'],
        threshold: 0.35,
      }),
    [list]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    return fuse.search(searchQuery.trim()).map((r) => r.item);
  }, [list, searchQuery, fuse]);

  const profileSlug = profile.data?.slug;
  const header = (
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
        {profileSlug ? (
          <Link to="/profiles/$profileSlug" params={{ profileSlug }}>
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

  if (factions.isPending) {
    return (
      <PageLayout header={header}>
        <p className={styles.empty}>Loading factions…</p>
      </PageLayout>
    );
  }

  if (list.length === 0) {
    return (
      <PageLayout header={header}>
        <p className={styles.empty}>No factions yet.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={header}
      toolbar={
        <Toolbar>
          <Toolbar.Left>
            <ToolbarSearchField
              className={styles.toolbarSearch}
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search by name or slug…"
              aria-label="Search factions"
            />
          </Toolbar.Left>
          <Toolbar.Right>
            <span className={styles.meta}>
              {filtered.length === list.length
                ? `${list.length} faction${list.length === 1 ? '' : 's'}`
                : `${filtered.length} of ${list.length} shown`}
            </span>
          </Toolbar.Right>
        </Toolbar>
      }
    >
      {filtered.length > 0 ? (
        <FactionList factions={filtered} />
      ) : (
        <p className={styles.noResults}>No factions match your search.</p>
      )}
    </PageLayout>
  );
}
