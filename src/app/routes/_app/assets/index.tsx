import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@app/components/shell';

export const Route = createFileRoute('/_app/assets/')({
  component: AssetsPage,
});

function AssetsPage() {
  return (
    <PageLayout header={<h1>Assets</h1>}>
      <p>Game assets will appear here.</p>
    </PageLayout>
  );
}
