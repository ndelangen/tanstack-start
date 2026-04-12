import { Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { ProfileLink } from '@app/components/profile/ProfileLink';

import styles from './AuthNav.module.css';

export function AuthNav() {
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
