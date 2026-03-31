import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { loadFactionBySlug, useFaction } from '@db/factions';
import '@app/components/factions/sheet/FactionSheetDocument.css';

import { FactionSheetView } from '@app/components/factions/sheet/FactionSheetView';
import { useFactionSheetPostMessage } from '@app/hooks/useFactionSheetPostMessage';

export const Route = createFileRoute('/_app/factions/$factionId/sheet')({
  validateSearch: (params: Record<string, unknown>): { mode: 'db' | 'live' } => {
    return params.mode === 'live' ? { mode: 'live' } : { mode: 'db' };
  },
  loader: async ({ params, location }) => {
    // Loader deps do not include validated `search`; parse query string (matches validateSearch).
    const mode = new URLSearchParams(location.search).get('mode') ?? 'db';
    if (mode === 'live') {
      return undefined;
    }
    return await loadFactionBySlug(params.factionId);
  },
  component: FactionSheetPage,
});

function FactionSheetPage() {
  const { factionId } = Route.useParams();
  const { mode } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const initialData = mode === 'db' ? loaderData : undefined;
  const factionFromDb = useFaction(factionId, {
    enabled: mode === 'db',
    initialData,
  });
  const factionFromMessage = useFactionSheetPostMessage(mode === 'live');

  useEffect(() => {
    document.documentElement.dataset.factionSheet = '';
    return () => {
      delete document.documentElement.dataset.factionSheet;
    };
  }, []);

  if (mode === 'live') {
    if (!factionFromMessage) {
      return (
        <p style={{ margin: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          Live preview: waiting for faction data via <code>postMessage</code> (same origin).
        </p>
      );
    }
    return <FactionSheetView faction={factionFromMessage} />;
  }

  if (!factionFromDb.data) {
    return null;
  }

  return <FactionSheetView faction={factionFromDb.data.data} />;
}
