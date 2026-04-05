import { Link, useLocation } from '@tanstack/react-router';
import React, { useEffect, useRef, useState } from 'react';

import { useCurrentProfile } from '@db/profiles';
import { ProfileLink } from '@app/components/profile/ProfileLink';

import './Page.css';

import styles from './Page.module.css';

const SCROLL_VAR = '--scroll-pct';

function AuthNav() {
  const profile = useCurrentProfile();

  if (profile.data) {
    return (
      <ProfileLink
        slug={profile.data.slug}
        username={profile.data.username}
        avatar_url={profile.data.avatar_url}
        className={styles.avatarLink}
        title={profile.data.username ?? 'Profile'}
        showUsername={false}
      />
    );
  }

  return (
    <Link to="/auth/login" activeProps={{ className: styles.navLinkActive }}>
      Login
    </Link>
  );
}

export interface PageProps {
  head?: React.ReactNode;
  content: React.ReactNode;
}

const update = () => {
  const el = document.documentElement;
  const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const maxScroll = Math.max(0, scrollHeight - window.innerHeight);
  const remainingScroll = Math.max(0, maxScroll - window.scrollY);
  const pct = maxScroll > 0 ? 100 - (remainingScroll / maxScroll) * 100 : 100;

  el.style.setProperty(SCROLL_VAR, `${Math.min(100, Math.max(0, pct))}`);
};

export function Page({ head, content }: PageProps) {
  const tiny = !head;
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.documentElement;

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };
    const onScroll = () => {
      el.removeAttribute('data-initial-animate');
      scheduleUpdate();
    };
    el.setAttribute('data-initial-animate', '');
    el.style.setProperty(SCROLL_VAR, '0');
    // rafId = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(document.body);

    return () => {
      rafId !== null && cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = document.documentElement;

    el.dataset.route = location.pathname;
    el.setAttribute('data-initial-animate', '');
  }, [location.pathname]);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/web/head.png';
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.main}>
        <div
          className={`${styles.header} ${imageLoaded ? styles.loaded : ''} ${tiny ? styles.tiny : ''}`}
        >
          <nav className={styles.nav}>
            <div className={styles.links}>
              <div className={styles.logo}>
                <Link to="/">
                  <img className={styles.logoImg} src="/web/logo.svg" alt="Dune" />
                </Link>
              </div>
              <Link
                to="/"
                activeProps={{ className: styles.navLinkActive }}
                activeOptions={{ exact: true }}
              >
                Home
              </Link>
              <Link to="/factions" activeProps={{ className: styles.navLinkActive }}>
                Factions
              </Link>
              <Link to="/rulesets" activeProps={{ className: styles.navLinkActive }}>
                Rulesets
              </Link>
              <Link to="/profiles" activeProps={{ className: styles.navLinkActive }}>
                Profiles
              </Link>
              <Link to="/assets" activeProps={{ className: styles.navLinkActive }}>
                Assets
              </Link>
            </div>
            <div className={styles.auth}>
              <AuthNav />
            </div>
          </nav>
          {head && <div className={styles.content}>{head}</div>}
        </div>

        {content}
      </div>
      <div className={styles.footer}>
        <p>
          <Link to="/privacy">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
