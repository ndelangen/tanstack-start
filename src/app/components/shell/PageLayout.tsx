import type { ReactNode } from 'react';

import styles from './PageLayout.module.css';

export interface PageLayoutProps {
  /** Content rendered inside the hero. Omit only for intentionally compact pages. */
  header?: ReactNode;
  /** Page-level controls rendered before the main content. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/** Route-owned page composition with typed header, toolbar, and content slots. */
export function PageLayout({ header, toolbar, children }: PageLayoutProps) {
  return (
    <div className={styles.layout} data-page-layout-compact={header == null ? 'true' : undefined}>
      {header != null && <div className={styles.headerContent}>{header}</div>}
      <main className={styles.content}>
        {toolbar}
        {children}
      </main>
    </div>
  );
}
