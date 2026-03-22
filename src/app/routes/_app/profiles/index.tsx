import { createFileRoute, Link } from '@tanstack/react-router';

import { profilesListQueryOptions, useProfilesAll } from '@db/profiles';
import { Card } from '@app/components/card/Card';

import styles from './ProfilesIndex.module.css';

export const Route = createFileRoute('/_app/profiles/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profilesListQueryOptions()),
  component: ProfilesPage,
});

function ProfilesPage() {
  const profiles = useProfilesAll();

  return (
    <div className={styles.root}>
      {profiles.data && profiles.data.length > 0 ? (
        <Card>
          <ul className={styles.list}>
            {profiles.data.map((profile) => {
              const initials =
                profile.username
                  ?.slice(0, 2)
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '') || '?';
              return (
                <li key={profile.id} className={styles.row}>
                  <Link to="/profiles/$slug" params={{ slug: profile.slug }}>
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username ?? 'Avatar'}
                        className={styles.avatar}
                      />
                    ) : (
                      <span className={styles.avatarPlaceholder}>{initials}</span>
                    )}
                  </Link>
                  <Link to="/profiles/$slug" params={{ slug: profile.slug }}>
                    {profile.username ?? 'Unknown'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <p className={styles.empty}>No profiles yet.</p>
      )}
    </div>
  );
}
