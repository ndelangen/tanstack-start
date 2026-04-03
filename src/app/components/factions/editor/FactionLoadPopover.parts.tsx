import { Token as FactionToken } from '@game/assets/faction/token/Token';

import type { FactionData, FactionLoadPickerRow } from '@db/factions';

import styles from './FactionEditor.module.css';

export function factionLoadOptionLabel(row: FactionLoadPickerRow): string {
  return `${row.data.name} (${row.data.slug})`;
}

export function factionLoadOptionSearchText(row: FactionLoadPickerRow): string {
  return [row.id, row.data.name, row.data.slug, row.groupLabel, row.ownerUsername ?? ''].join(' ');
}

export function factionLoadOwnerLabel(row: Pick<FactionLoadPickerRow, 'ownerUsername' | 'ownerId'>): string {
  const u = row.ownerUsername?.trim();
  if (u) return u;
  return row.ownerId || 'Unknown owner';
}

export type FactionLoadOptionRowProps = {
  name: string;
  slug: string;
  logo: FactionData['logo'];
  background: FactionData['background'];
  ownerLabel: string;
  groupLabel: string;
  isMember: boolean;
};

export function FactionLoadOptionRow({
  name,
  slug,
  logo,
  background,
  ownerLabel,
  groupLabel,
  isMember,
}: FactionLoadOptionRowProps) {
  return (
    <div className={styles.loadFactionOptionRow}>
      <span className={styles.loadFactionOptionToken} aria-hidden>
        <FactionToken logo={logo} background={background} />
      </span>
      <span className={styles.loadFactionOptionBody}>
        <span className={styles.loadFactionOptionName}>{name}</span>
        <span className={styles.loadFactionOptionMeta}>
          Owner: {ownerLabel} · Group: {groupLabel}
          {isMember ? ' (You are a member)' : ''}
        </span>
        <span className={styles.loadFactionOptionMeta}>Slug: {slug}</span>
      </span>
    </div>
  );
}
