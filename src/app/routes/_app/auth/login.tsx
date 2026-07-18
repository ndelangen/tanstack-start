import { createFileRoute, Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { LoginForm } from '@app/components/auth/LoginForm';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { PageLayout } from '@app/components/shell';

export const Route = createFileRoute('/_app/auth/login')({
  component: LoginPage,
});

function LoginPage() {
  const profile = useCurrentProfile();

  return (
    <PageLayout header={<h1>Sign in</h1>}>
      <Card>
        {profile.data ? (
          <Stack gap={3}>
            <h2>You're signed in</h2>
            <p>{profile.data.username ?? 'Player'}</p>
            <Link to="/">Go to home</Link>
          </Stack>
        ) : (
          <LoginForm />
        )}
      </Card>
    </PageLayout>
  );
}
