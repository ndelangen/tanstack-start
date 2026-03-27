import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { FactionEditor } from '@app/components/factions/editor/FactionEditor';
import { Card } from '@app/components/generic/surfaces/Card';
import { defaultFaction } from '@data/defaultFaction';

export const Route = createFileRoute('/_app/factions/create')({
  component: CreateFactionPage,
});

function CreateFactionPage() {
  const navigate = useNavigate();
  const profile = useCurrentProfile();

  if (!profile?.data?.id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to create a faction.
        </p>
        <p>
          <Link to="/factions">Back to factions</Link>
        </p>
      </Card>
    );
  }

  return (
    <FactionEditor
      key="create"
      mode="create"
      initialFaction={defaultFaction}
      onCancel={() => navigate({ to: '/factions' })}
      onSaved={(slug) => navigate({ to: '/factions/$factionId', params: { factionId: slug } })}
    />
  );
}
