import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

import type { ProfileEntry } from '@db/profile';

import styles from './ProfileLink.module.css';

export type ProfileLinkProps = Pick<ProfileEntry, 'slug' | 'username' | 'avatar_url'> & {
  className?: string;
  style?: CSSProperties;
  title?: string;
  showUsername?: boolean;
  children?: ReactNode;
};

export const ProfileLink = ({
  slug,
  username,
  avatar_url,
  className,
  style,
  title,
  showUsername = true,
  children,
}: ProfileLinkProps) => {
  const afterAvatar =
    children !== undefined ? (
      children
    ) : showUsername ? (
      <span className={styles.username}>{username}</span>
    ) : null;

  return (
    <Link
      to="/profiles/$profileSlug"
      params={{ profileSlug: slug }}
      className={clsx(styles.link, className)}
      style={style}
      title={title}
    >
      {avatar_url ? (
        <img src={avatar_url} alt={username ?? 'Avatar'} className={styles.avatar} />
      ) : (
        <span className={styles.avatarPlaceholder}>{username?.slice(0, 2).toUpperCase()}</span>
      )}
      {afterAvatar}
    </Link>
  );
};
