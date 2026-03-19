import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { factionDetailQueryOptions, useFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/card/Card';
import { FactionEditor } from '@app/components/factions/editor';

export const Route = createFileRoute('/_app/factions/$id/edit')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(factionDetailQueryOptions(params.id));
  },
  component: FactionEditPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Edit faction</h1>
        <p>
          <Link to="/factions" activeProps={{ style: { fontWeight: 'bold' } }}>
            All factions
          </Link>
          {' · '}
          <Link to="/factions/mine" activeProps={{ style: { fontWeight: 'bold' } }}>
            My factions
          </Link>
          {' · '}
          <Link to="/factions/create" activeProps={{ style: { fontWeight: 'bold' } }}>
            Create a new faction
          </Link>
        </p>
      </div>
    ),
  },
});

function FactionEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const faction = useFaction(id);
  const profile = useCurrentProfile();

  if (!profile?.data?.id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to edit factions.
        </p>
        <p>
          <Link to="/factions/$id" params={{ id }}>
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
      key={id}
      mode="edit"
      factionRowId={id}
      initialFaction={faction.data.data}
      onCancel={() => navigate({ to: '/factions/$id', params: { id } })}
    />
  );
}
