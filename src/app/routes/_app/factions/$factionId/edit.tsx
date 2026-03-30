import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';

import { loadFactionBySlug, useFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { FactionEditor } from '@app/components/factions/editor/FactionEditor';
import { Card } from '@app/components/generic/surfaces/Card';

export const Route = createFileRoute('/_app/factions/$factionId/edit')({
  loader: async ({ params }) => ({ faction: await loadFactionBySlug(params.factionId) }),
  component: FactionEditPage,
});

const appRouteApi = getRouteApi('/_app');

function FactionEditPage() {
  const { factionId } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const faction = useFaction(factionId, { initialData: loaderData.faction });
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });

  if (!profile?.data?.id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to edit factions.
        </p>
        <p>
          <Link to="/factions/$factionId" params={{ factionId }}>
            Back to faction
          </Link>
        </p>
      </Card>
    );
  }

  if (!faction.data) {
    return null;
  }

  const { slug: _ignored, ...initialFactionInput } = faction.data.data;

  return (
    <FactionEditor
      key={faction.data.id}
      mode="edit"
      factionRowId={faction.data.id}
      initialFaction={initialFactionInput}
      onCancel={() => navigate({ to: '/factions/$factionId', params: { factionId } })}
      onSaved={(newSlug) => {
        if (newSlug !== factionId) {
          navigate({
            to: '/factions/$factionId/edit',
            params: { factionId: newSlug },
            replace: true,
          });
        }
      }}
    />
  );
}
