import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';

import { AppShell } from '@app/components/shell';
import { isFactionSheetBarePath } from '@app/lib/factionSheetRoute';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  const pathname = useLocation({ select: (l) => l.pathname });

  if (isFactionSheetBarePath(pathname)) {
    return <Outlet />;
  }

  return (
    <AppShell pathname={pathname}>
      <Outlet />
    </AppShell>
  );
}
