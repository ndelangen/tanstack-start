import { Stack } from '@mantine/core';
import clsx from 'clsx';
import type { ReactNode } from 'react';

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
      <Stack gap="xs" className={styles.itemContent}>
        {children}
      </Stack>
    </li>
  );
}
