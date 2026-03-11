import { createFileRoute } from '@tanstack/react-router';

import { LoginForm } from '@app/components/login-form';
import { db } from '@app/db/connect';

export const Route = createFileRoute('/auth/login')({
  component: Login,
});

function Login() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {db.auth.getUser() ? (
          <div>Logged in as {db.auth.getUser().data.user?.email}</div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
