import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/factions/create')({
  component: CreateFactionPage,
});

function CreateFactionPage() {
  return (
    <>
      <h2>Create a new faction</h2>
      <p>This page has no Page.Head, so the header is collapsed (tiny).</p>
    </>
  );
}
