import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './FaqList.module.css';

export type FaqItemListProps = {
  className?: string;
  children: ReactNode;
};

/**
 * FAQ thread list shell: shared `.list` layout from {@link FaqList.module.css}.
 * Parent owns empty state and row content (same boundary as the factions grid list).
 */
export function FaqItemList({ className, children }: FaqItemListProps) {
  return <ul className={clsx(styles.list, className)}>{children}</ul>;
}

export type FaqItemListRowProps = {
  children: ReactNode;
};

/**
 * Single FAQ row: `.item` + inner `.itemLink` column for mixed links and meta.
 */
export function FaqItemListRow({ children }: FaqItemListRowProps) {
  return (
    <li className={styles.item}>
      <div className={styles.itemLink}>{children}</div>
    </li>
  );
}
