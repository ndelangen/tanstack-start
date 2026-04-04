import clsx from 'clsx';

import { type FactionEntry } from '@db/factions';
import { BlockLink } from '@app/components/generic/surfaces';
import { Token as FactionToken } from '@game/assets/faction/token/Token';

import styles from './FactionList.module.css';

export type FactionListProps = {
  factions: FactionEntry[];
  className?: string;
};

/**
 * Responsive grid of faction tiles using shared {@link BlockLink} + {@link FactionToken}.
 * Renders nothing when `factions` is empty.
 */
export function FactionList({ factions, className }: FactionListProps) {
  if (factions.length === 0) {
    return null;
  }

  return (
    <div className={clsx(styles.grid, className)}>
      {factions.map((faction) => (
        <FactionListItem key={faction._id} faction={faction} />
      ))}
    </div>
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
        <div className={styles.tokenSquare}>
          <FactionToken logo={logo} background={background} />
        </div>
      </div>
      <span className={styles.name}>{name}</span>
    </BlockLink>
  );
}
