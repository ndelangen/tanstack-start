import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/generic/surfaces/Card';
import { ProfileSettingsForm } from '@app/components/profile/ProfileSettingsForm';

export const Route = createFileRoute('/_app/profiles/settings')({
  component: ProfileSettingsPage,
  staticData: {
    PageHead: ProfileSettingsPageHead,
  },
});

const appRouteApi = getRouteApi('/_app');

function ProfileSettingsPageHead() {
  return (
    <div>
      <h1>Edit profile</h1>
    </div>
  );
}

function ProfileSettingsPage() {
  const appLoaderData = appRouteApi.useLoaderData();
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });

  if (!profile.data) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to edit your profile.
        </p>
      </Card>
    );
  }

  return <ProfileSettingsForm />;
}
