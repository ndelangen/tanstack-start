import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@app/components/shell';

export const Route = createFileRoute('/_app/assets/create')({
  component: CreateAssetsPage,
});

function CreateAssetsPage() {
  return (
    <PageLayout header={<h1>Create an asset</h1>}>
      <p>Asset creation tools will appear here.</p>
    </PageLayout>
  );
}
