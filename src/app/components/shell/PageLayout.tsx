import clsx from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';

import styles from './PageLayout.module.css';

let heroImageLoaded = false;

export interface PageLayoutProps {
  /** Content rendered inside the hero. Omit only for intentionally compact pages. */
  header?: ReactNode;
  /** Page-level controls rendered before the main content. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/** Route-owned page composition with typed header, toolbar, and content slots. */
export function PageLayout({ header, toolbar, children }: PageLayoutProps) {
  const [imageLoaded, setImageLoaded] = useState(heroImageLoaded);

  useEffect(() => {
    if (heroImageLoaded) return;
    const image = new Image();
    image.onload = () => {
      heroImageLoaded = true;
      setImageLoaded(true);
    };
    image.src = '/web/head.png';
  }, []);

  return (
    <>
      <header
        className={clsx(
          styles.hero,
          imageLoaded && styles.loaded,
          header == null && styles.compact
        )}
      >
        {header != null && <div className={styles.headerContent}>{header}</div>}
      </header>
      <main className={styles.content}>
        {toolbar}
        {children}
      </main>
    </>
  );
}
