import { createFileRoute } from '@tanstack/react-router';

import { loadProfilesAll, useProfilesAll } from '@db/profiles';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { ProfileLink } from '@app/components/profile/ProfileLink';

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
          <Stack as="ul" gap={2} className={styles.list}>
            {profiles.data.map((profile) => (
              <li key={profile._id} className={styles.row}>
                <ProfileLink
                  slug={profile.slug}
                  username={profile.username}
                  avatar_url={profile.avatar_url}
                />
              </li>
            ))}
          </Stack>
        </Card>
      ) : (
        <p className={styles.empty}>No profiles yet.</p>
      )}
    </div>
  );
}
