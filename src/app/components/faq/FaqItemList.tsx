import clsx from 'clsx';
import type { ReactNode } from 'react';

import { Stack } from '@app/components/generic/layout';

import styles from './FaqItemList.module.css';

export type FaqItemListProps = {
  className?: string;
  children: ReactNode;
};

/**
 * FAQ thread list shell. Parent owns empty state and row content.
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
      <Stack gap={2} className={styles.itemContent}>
        {children}
      </Stack>
    </li>
  );
}
