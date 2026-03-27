import type { ReactNode } from 'react';

import styles from './Card.module.css';

interface CardProps {
  header?: ReactNode;
  children: ReactNode;
}

export function Card({ header, children }: CardProps) {
  return (
    <div className={styles.card}>
      {header != null && <div className={styles.cardHeader}>{header}</div>}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
