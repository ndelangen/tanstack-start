// import { TanStackDevtools } from '@tanstack/react-devtools';

import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router';

import { convex } from '@db/core';

import '@fontsource/caladea/latin-400.css';
import '@fontsource/caladea/latin-400-italic.css';
import '@fontsource/caladea/latin-700.css';
import '@fontsource/caladea/latin-700-italic.css';
import '@fontsource/lato/latin.css';
import '@fontsource/lato/latin-italic.css';
import '../styles/fonts.css';
import '../styles/tokens.css';

// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

export const Route = createRootRoute({
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
      {
        name: 'google-site-verification',
        content: 'RPI_TL3TCH_KTbnzwKeXOJ8LY8EklOlsRStyfysz-24',
      },
    ],
    links: [],
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
      </body>
    </html>
  );
}
