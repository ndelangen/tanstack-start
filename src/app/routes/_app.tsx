import mantineStylesHref from '@mantine/core/styles.layer.css?url';
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';

import { ApplicationChrome } from '@app/components/shell/ApplicationChrome';
import { AppNotFound } from '@app/components/shell/AppNotFound';

import compatibilityStylesHref from '../styles/mantine-shell-compatibility.css?url';

function routeStylesheet(href: string) {
  return {
    rel: 'stylesheet' as const,
    href,
    // React precedence resources intentionally survive unmount. Keep these as ordinary links so
    // HeadContent removes them when the application route match leaves.
    precedence: false as never,
  };
}

export const Route = createFileRoute('/_app')({
  codeSplitGroupings: [['component', 'notFoundComponent']],
  head: () => ({
    links: [routeStylesheet(mantineStylesHref), routeStylesheet(compatibilityStylesHref)],
  }),
  component: AppLayout,
  notFoundComponent: AppNotFound,
});

function AppLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <ApplicationChrome pathname={pathname}>
      <Outlet />
    </ApplicationChrome>
  );
}
