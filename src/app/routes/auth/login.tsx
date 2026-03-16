import { createFileRoute } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { LoginForm } from '@app/components/login-form';

export const Route = createFileRoute('/auth/login')({
  component: Login,
});

function Login() {
  const profile = useCurrentProfile();

  return (
    <div>
      <div>{profile.data ? <div>Logged in as {profile.data.username}</div> : <LoginForm />}</div>
    </div>
  );
}
