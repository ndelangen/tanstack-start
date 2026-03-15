import { Link } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';

import './Page.css';

import styles from './Page.module.css';

const SCROLL_VAR = '--scroll-pct';

export interface PageProps {
  head?: React.ReactNode;
  content: React.ReactNode;
}

export function Page({ head, content }: PageProps) {
  const tiny = !head;

  useEffect(() => {
    const el = document.documentElement;
    const update = () => {
      const maxScroll = el.scrollHeight - window.innerHeight;
      const remainingScroll = Math.max(0, maxScroll - window.scrollY);
      const pct = maxScroll > 0 ? 100 - (remainingScroll / maxScroll) * 100 : 100;
      el.style.setProperty(SCROLL_VAR, `${Math.min(100, Math.max(0, pct))}`);
    };
    let rafId: number | undefined;
    const onScroll = () => {
      el.removeAttribute('data-initial-animate');
      rafId = requestAnimationFrame(update);
    };
    el.setAttribute('data-initial-animate', '');
    el.style.setProperty(SCROLL_VAR, '0');
    requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      rafId != null && cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/web/head.jpg';
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div
          className={`${styles.header} ${imageLoaded ? styles.loaded : ''} ${tiny ? styles.tiny : ''}`}
        >
          <nav className={styles.nav}>
            <div className={styles.navLinks}>
              <Link
                to="/"
                activeProps={{ className: styles.navLinkActive }}
                activeOptions={{ exact: true }}
              >
                Home
              </Link>
              <Link to="/settings" activeProps={{ className: styles.navLinkActive }}>
                Settings
              </Link>
            </div>
          </nav>
          {head && <div className={styles.headerContent}>{head}</div>}
        </div>

        {content}
      </div>
      <div className={styles.footer}>
        <p>Footer</p>
      </div>
    </div>
  );
}
