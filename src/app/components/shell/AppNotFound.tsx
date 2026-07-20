import { Link, useLocation } from '@tanstack/react-router';

import { ApplicationChrome } from './ApplicationChrome';
import { PageLayout } from './PageLayout';

export function AppNotFound() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <ApplicationChrome pathname={pathname}>
      <PageLayout header={<h1>404 - Page Not Found</h1>}>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">Go back home</Link>
      </PageLayout>
    </ApplicationChrome>
  );
}
