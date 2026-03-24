import { createFileRoute, Outlet, useLocation, useMatches } from '@tanstack/react-router';
import React from 'react';

import { Page } from '@app/components/page/Page';
import { isFactionSheetBarePath } from '@app/lib/factionSheetRoute';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const pageHead = useMatches({
    select: (matches) => {
      const leaf = matches.at(-1);
      const HeadComponent = (leaf?.staticData as { PageHead?: React.ComponentType })?.PageHead;
      return HeadComponent ? <HeadComponent /> : undefined;
    },
  });

  if (isFactionSheetBarePath(pathname)) {
    return <Outlet />;
  }

  return <Page head={pageHead} content={<Outlet />} />;
}
