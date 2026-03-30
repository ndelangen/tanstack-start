import { createFileRoute, Outlet, useLocation, useMatches } from '@tanstack/react-router';
import React from 'react';

import { isTanStackStartPrerendering } from '@db/core';
import { loadCurrentProfile, loadCurrentUserId, useCurrentProfile } from '@db/profiles';
import { Page } from '@app/components/generic/surfaces/Page';
import { isFactionSheetBarePath } from '@app/lib/factionSheetRoute';

export const Route = createFileRoute('/_app')({
  loader: async () => {
    if (isTanStackStartPrerendering()) {
      return { currentProfile: null, currentUserId: null };
    }
    const [currentProfile, currentUserId] = await Promise.all([
      loadCurrentProfile(),
      loadCurrentUserId(),
    ]);
    return { currentProfile, currentUserId };
  },
  component: AppLayout,
});

function AppLayout() {
  const loaderData = Route.useLoaderData();
  useCurrentProfile({
    initialCurrent: loaderData.currentProfile,
    initialCurrentUserId: loaderData.currentUserId,
  });
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
