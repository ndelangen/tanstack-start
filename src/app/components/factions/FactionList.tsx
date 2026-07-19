import { type FactionEntry } from '@db/factions';
import { AutoGrid } from '@app/components/generic/layout';
import { BlockLink } from '@app/components/generic/surfaces';
import { LeaderToken } from '@game/assets/faction/leader/Leader';
import { TroopToken } from '@game/assets/faction/troop/Troop';
import { BackgroundRenderer } from '@game/assets/utils/BackgroundRenderer';

import styles from './FactionList.module.css';

export type FactionListProps = {
  factions: FactionEntry[];
  className?: string;
};

/**
 * Responsive grid of compact faction identity plates.
 * An empty `factions` array renders the standard no-results line (e.g. search filter).
 * Callers that need different empty UX should not render this with an empty list.
 */
export function FactionList({ factions, className }: FactionListProps) {
  if (factions.length === 0) {
    return <p className={styles.noResults}>No factions match your search.</p>;
  }

  return (
    <AutoGrid minColumnWidth="420px" gap={4} className={className}>
      {factions.map((faction) => (
        <FactionListItem key={faction._id} faction={faction} />
      ))}
    </AutoGrid>
  );
}

function FactionListItem({ faction }: { faction: FactionEntry }) {
  const { name, logo, background, hero, leaders, troops } = faction.data;

  return (
    <BlockLink
      to="/factions/$factionId"
      params={{ factionId: faction.slug }}
      className={styles.card}
    >
      <BackgroundRenderer background={background} className={styles.artwork}>
        <div className={styles.glyphMark}>
          <svg className={styles.glyph} viewBox="0 0 100 100" role="img">
            <title>{name} symbol</title>
            <use href={`${logo}#root`} />
          </svg>
        </div>
        <div className={styles.glossary}>
          <div className={styles.heroToken} title={`Faction leader: ${hero.name}`}>
            <LeaderToken {...hero} strength={undefined} background={background} logo={logo} />
          </div>
          <div className={styles.leaderSamples}>
            {leaders.slice(0, 3).map((leader) => (
              <span key={`${leader.name}-${leader.image}`} title={leader.name}>
                <LeaderToken {...leader} background={background} logo={logo} />
              </span>
            ))}
          </div>
          <div className={styles.troopSamples}>
            {troops.slice(0, 2).map((troop) => (
              <span key={`${troop.name}-${troop.image}`} title={troop.name}>
                <TroopToken
                  background={background}
                  image={troop.image}
                  star={troop.star}
                  striped={troop.striped}
                />
              </span>
            ))}
          </div>
        </div>
        <div className={styles.content}>
          <strong className={styles.name}>{name}</strong>
        </div>
      </BackgroundRenderer>
    </BlockLink>
  );
}
