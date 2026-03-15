import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <h2>Settings</h2>
      <p>This page has no Page.Head, so the header is collapsed (tiny).</p>
    </>
  );
}
