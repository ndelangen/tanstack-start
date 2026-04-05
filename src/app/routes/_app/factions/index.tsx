import { createFileRoute, Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';

import { loadFactionsAll, useFactionsAll } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { Toolbar, ToolbarSearchField } from '@app/components/generic/layout';

import styles from './FactionsIndex.module.css';

function FactionsIndexPageHead() {
  const profile = useCurrentProfile();
  const slug = profile.data?.slug;

  return (
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
        {slug ? (
          <Link to="/profiles/$profileSlug" params={{ profileSlug: slug }}>
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

export const Route = createFileRoute('/_app/factions/')({
  loader: async () => ({ factions: await loadFactionsAll() }),
  component: FactionsPage,
  staticData: {
    PageHead: FactionsIndexPageHead,
  },
});

function FactionsPage() {
  const loaderData = Route.useLoaderData();
  const factions = useFactionsAll({ initialData: loaderData.factions });
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

  if (factions.isPending) {
    return <p className={styles.empty}>Loading factions…</p>;
  }

  if (list.length === 0) {
    return <p className={styles.empty}>No factions yet.</p>;
  }

  return (
    <>
      <Toolbar className={styles.toolbar}>
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

      <FactionList factions={filtered} />
    </>
  );
}
