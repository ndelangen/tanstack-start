import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/factions/')({
  component: FactionsPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Factions</h1>
        <p>
          <Link to="/factions/create">Create a new faction</Link>
        </p>
      </div>
    ),
  },
});

function FactionsPage() {
  return (
    <>
      <h2>Factions</h2>
      <p>This page has no Page.Head, so the header is collapsed (tiny).</p>
    </>
  );
}
