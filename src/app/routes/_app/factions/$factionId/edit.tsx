import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/card/Card';
import { FactionEditor } from '@app/components/factions/editor';

export const Route = createFileRoute('/_app/factions/$factionId/edit')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(factionDetailQueryOptions(params.factionId));
  },
  component: FactionEditPage,
});

function FactionEditPage() {
  const { factionId } = Route.useParams();
  const navigate = useNavigate();
  const faction = useFaction(factionId);
  const profile = useCurrentProfile();

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

  return (
    <FactionEditor
      key={faction.data.id}
      mode="edit"
      factionRowId={faction.data.id}
      initialFaction={faction.data.data}
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
