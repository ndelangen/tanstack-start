import { createFileRoute, Link } from '@tanstack/react-router';

import { loadProfilesAll, useProfilesAll } from '@db/profiles';
import { Card } from '@app/components/generic/surfaces/Card';

import styles from './ProfilesIndex.module.css';

export const Route = createFileRoute('/_app/profiles/')({
  loader: async () => ({ profiles: await loadProfilesAll() }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const loaderData = Route.useLoaderData();
  const profiles = useProfilesAll({ initialData: loaderData.profiles });

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
