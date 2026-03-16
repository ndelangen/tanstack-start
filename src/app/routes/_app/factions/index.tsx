import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/factions/')({
  component: FactionsPage,
});

function FactionsPage() {
  return (
    <>
      <h2>Factions</h2>
      <p>This page has no Page.Head, so the header is collapsed (tiny).</p>
    </>
  );
}
