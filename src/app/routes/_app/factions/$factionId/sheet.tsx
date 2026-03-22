import { createFileRoute } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { FactionSheetView } from '@app/components/factions/sheet/FactionSheetView';
import { useFactionSheetPostMessage } from '@app/hooks/useFactionSheetPostMessage';

export const Route = createFileRoute('/_app/factions/$factionId/sheet')({
  validateSearch: (params: Record<string, unknown>): { mode: 'db' | 'live' } => {
    return params.mode === 'live' ? { mode: 'live' } : { mode: 'db' };
  },
  loader: async ({ context, params, location }) => {
    // Loader deps do not include validated `search`; parse query string (matches validateSearch).
    const mode = new URLSearchParams(location.search).get('mode') ?? 'db';
    if (mode === 'live') {
      return;
    }
    await context.queryClient.ensureQueryData(factionDetailQueryOptions(params.factionId));
  },
  component: FactionSheetPage,
});

function FactionSheetPage() {
  const { factionId } = Route.useParams();
  const { mode } = Route.useSearch();
  const factionFromDb = useFaction(factionId, { enabled: mode === 'db' });
  const factionFromMessage = useFactionSheetPostMessage(mode === 'live');

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
