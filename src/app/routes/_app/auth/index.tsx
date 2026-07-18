import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/auth/')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login' });
  },
});
