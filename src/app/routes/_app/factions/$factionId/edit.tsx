import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';

import { useDeleteFaction, useSetFactionGroup, useUpdateFaction } from '@db/factions';
import { loadFactionEditorPageBySlug } from '@app/factions/db';
import { useCurrentProfile } from '@db/profiles';
import { FactionEditor, type FactionEditorHandle } from '@app/components/factions/editor/FactionEditor';
import { FactionEditorToolbar } from '@app/components/factions/editor/FactionEditorToolbar';
import { Card } from '@app/components/generic/surfaces/Card';

export const Route = createFileRoute('/_app/factions/$factionId/edit')({
  loader: async ({ params }) => ({ editorPage: await loadFactionEditorPageBySlug(params.factionId) }),
  component: FactionEditPage,
});

const appRouteApi = getRouteApi('/_app');

function FactionEditPage() {
  const { factionId } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const editorRef = useRef<FactionEditorHandle | null>(null);
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();
  const setFactionGroup = useSetFactionGroup();
  const { editorPage } = loaderData;
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

  const { faction, group } = editorPage;
  const { slug: _ignored, ...initialFactionInput } = faction.data;

  const canDelete = faction.owner_id === profile.data.id;
  const canAssignGroup = canDelete;

  return (
    <>
      <FactionEditorToolbar
        mode="edit"
        isSaving={false}
        currentValues={initialFactionInput}
        currentGroupId={group ? group._id : null}
        canAssignGroup={canAssignGroup}
        canDelete={canDelete}
        onSave={() => editorRef.current?.submit()}
        onReset={() => editorRef.current?.resetToInitial()}
        onClose={() =>
          navigate({
            to: '/factions/$factionId',
            params: { factionId },
          })
        }
        onDelete={async () => {
          await deleteFaction.mutateAsync({ id: faction.id });
          navigate({ to: '/factions' });
        }}
        onChangeGroup={async (nextGroupId) => {
          await setFactionGroup.mutateAsync({ id: faction.id, groupId: nextGroupId });
        }}
      />
      <FactionEditor
        key={faction.id}
        ref={editorRef}
        initialFaction={initialFactionInput}
        factionEntry={faction}
        onSubmit={async (input) => {
          const entry = await updateFaction.mutateAsync({ input, id: faction.id });
          const newSlug = entry.data.slug;
          if (newSlug !== factionId) {
            navigate({
              to: '/factions/$factionId/edit',
              params: { factionId: newSlug },
              replace: true,
            });
          }
          return { slug: newSlug };
        }}
      />
    </>
  );
}
