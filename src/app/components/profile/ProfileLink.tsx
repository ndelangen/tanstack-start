import { Link } from '@tanstack/react-router';

import type { ProfileEntry } from '@db/profile';

import styles from './ProfileLink.module.css';

export const ProfileLink = (profile: Pick<ProfileEntry, 'slug' | 'username' | 'avatar_url'>) => {
  return (
    <Link to="/profiles/$slug" params={{ slug: profile.slug }} className={styles.link}>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.username ?? 'Avatar'}
          className={styles.avatar}
        />
      ) : (
        <span className={styles.avatarPlaceholder}>
          {profile.username?.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className={styles.username}>{profile.username}</span>
    </Link>
  );
};
