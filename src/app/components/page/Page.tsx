import { useEffect } from 'react';

import './Page.css';

import styles from './Page.module.css';

const SCROLL_VAR = '--scroll-pct';

export function Page({ children }: { children: React.ReactNode }) {
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

  return (
    <div className={styles.container}>
      <div className={styles.main}>{children}</div>
      <div className={styles.footer}>
        <p>Footer</p>
      </div>
    </div>
  );
}
