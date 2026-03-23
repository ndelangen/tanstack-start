// import { TanStackDevtools } from '@tanstack/react-devtools';

import { ConvexAuthProvider } from '@convex-dev/auth/react';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Link, Scripts } from '@tanstack/react-router';

import { convex } from '@db/core';
import { currentProfileQueryOptions } from '@db/profiles';
import { queryClient } from '@app/queryClient';

import '../styles/fonts.css';
import '../styles/tokens.css';

// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentProfileQueryOptions()),
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Caladea:ital,wght@0,400;0,700;1,400;1,700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Go back home</Link>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ConvexAuthProvider client={convex}>
            {children}
            {/* <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={
              [
                // {
                //   name: 'Tanstack Router',
                //   render: <TanStackRouterDevtoolsPanel />,
                // },
              ]
            }
          /> */}
            <Scripts />
          </ConvexAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
