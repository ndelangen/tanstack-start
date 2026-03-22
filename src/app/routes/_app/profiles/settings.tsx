import { createFileRoute, Link } from '@tanstack/react-router';

import { currentProfileQueryOptions, useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/card/Card';
import { ProfileSettingsForm } from '@app/components/profile/ProfileSettingsForm';

export const Route = createFileRoute('/_app/profiles/settings')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(currentProfileQueryOptions());
  },
  component: ProfileSettingsPage,
  staticData: {
    PageHead: ProfileSettingsPageHead,
  },
});

function ProfileSettingsPageHead() {
  return (
    <div>
      <h1>Edit profile</h1>
    </div>
  );
}

function ProfileSettingsPage() {
  const profile = useCurrentProfile();

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
