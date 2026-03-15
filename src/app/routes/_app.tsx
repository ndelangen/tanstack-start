import React from 'react';
import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';

import { Page } from '@app/components/page/Page';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  const pageHead = useMatches({
    select: (matches) => {
      const leaf = matches.at(-1);
      const HeadComponent = (leaf?.staticData as { PageHead?: React.ComponentType })?.PageHead;
      return HeadComponent ? <HeadComponent /> : undefined;
    },
  });

  return <Page head={pageHead} content={<Outlet />} />;
}
