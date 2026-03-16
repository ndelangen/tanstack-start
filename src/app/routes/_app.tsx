import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import React from 'react';

import { currentProfileQueryOptions } from '@db/profiles';
import { Page } from '@app/components/page/Page';

export const Route = createFileRoute('/_app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentProfileQueryOptions()),
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
