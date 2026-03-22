import { createFileRoute, Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { factionsListQueryOptions, useFactionsAll } from '@db/factions';
import { FactionList } from '@app/components/factions/FactionList';

import styles from './FactionsIndex.module.css';

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
  const [searchQuery, setSearchQuery] = useState('');

  const list = factions.data ?? [];

  const fuse = useMemo(
    () =>
      new Fuse(list, {
        keys: ['data.name', 'data.id'],
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
      <div className={styles.topBar}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or id…"
              aria-label="Search factions"
            />
          </div>
          <span className={styles.meta}>
            {filtered.length === list.length
              ? `${list.length} faction${list.length === 1 ? '' : 's'}`
              : `${filtered.length} of ${list.length} shown`}
          </span>
        </div>
      </div>

      {filtered.length > 0 ? (
        <FactionList factions={filtered} />
      ) : (
        <p className={styles.noResults}>No factions match your search.</p>
      )}
    </>
  );
}
