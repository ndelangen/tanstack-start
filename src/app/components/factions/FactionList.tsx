import { type FactionEntry } from '@db/factions';
import { AutoGrid } from '@app/components/generic/layout';
import { BlockLink } from '@app/components/generic/surfaces';
import { Token as FactionToken } from '@game/assets/faction/token/Token';

import styles from './FactionList.module.css';

export type FactionListProps = {
  factions: FactionEntry[];
  className?: string;
};

/**
 * Responsive grid of faction tiles using shared {@link BlockLink} + {@link FactionToken}.
 * An empty `factions` array renders the standard no-results line (e.g. search filter).
 * Callers that need different empty UX should not render this with an empty list.
 */
export function FactionList({ factions, className }: FactionListProps) {
  if (factions.length === 0) {
    return <p className={styles.noResults}>No factions match your search.</p>;
  }

  return (
    <AutoGrid minColumnWidth="180px" gap={6} className={className}>
      {factions.map((faction) => (
        <FactionListItem key={faction._id} faction={faction} />
      ))}
    </AutoGrid>
  );
}

function FactionListItem({ faction }: { faction: FactionEntry }) {
  const { name, logo, background } = faction.data;

  return (
    <BlockLink
      to="/factions/$factionId"
      params={{ factionId: faction.slug }}
      className={styles.card}
    >
      <div className={styles.coverSlot}>
        <div className={styles.token}>
          <FactionToken logo={logo} background={background} />
        </div>
      </div>
      <span className={styles.name}>{name}</span>
    </BlockLink>
  );
}
