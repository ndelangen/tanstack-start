import { createFileRoute, Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/generic/surfaces/Card';
import { ProfileSettingsForm } from '@app/components/profile/ProfileSettingsForm';

export const Route = createFileRoute('/_app/profiles/$profileSlug/edit')({
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
  const { profileSlug } = Route.useParams();
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

  if (profile.data.slug !== profileSlug) {
    return (
      <Card>
        <p>You can only edit your own profile.</p>
        <p>
          <Link to="/profiles/$profileSlug/edit" params={{ profileSlug: profile.data.slug }}>
            Go to your profile settings
          </Link>
        </p>
      </Card>
    );
  }

  return <ProfileSettingsForm />;
}
