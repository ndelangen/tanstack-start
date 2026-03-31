import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';

import { type FactionEntry, useCreateFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import { FactionEditor, type FactionEditorHandle } from '@app/components/factions/editor/FactionEditor';
import { FactionEditorToolbar } from '@app/components/factions/editor/FactionEditorToolbar';
import { Card } from '@app/components/generic/surfaces/Card';
import { defaultFaction } from '@data/defaultFaction';

export const Route = createFileRoute('/_app/factions/create')({
  component: CreateFactionPage,
});

function toSyntheticFactionEntry(defaultFactionData: typeof defaultFaction, ownerId: string): FactionEntry {
  // Minimal synthetic entry; slug is derived from name.
  return {
    _id: 'new' as never,
    _creationTime: Date.now(),
    owner_id: ownerId as never,
    data: { ...defaultFactionData, slug: defaultFactionData.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'faction' },
    slug: defaultFactionData.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'faction',
    group_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    id: 'new',
  };
}

function CreateFactionPage() {
  const navigate = useNavigate();
  const profile = useCurrentProfile();
  const createFaction = useCreateFaction();
  const editorRef = useRef<FactionEditorHandle | null>(null);

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

  const syntheticEntry = toSyntheticFactionEntry(defaultFaction, profile.data.id);

  return (
    <>
      <FactionEditorToolbar
        mode="create"
        isSaving={false}
        currentValues={defaultFaction}
        currentGroupId={null}
        canAssignGroup={false}
        canDelete={false}
        onSave={() => editorRef.current?.submit()}
        onReset={() => editorRef.current?.resetToInitial()}
        onClose={() => navigate({ to: '/factions' })}
      />
    <FactionEditor
      key="create"
        ref={editorRef}
      initialFaction={defaultFaction}
        factionEntry={syntheticEntry}
      onSubmit={async (input) => {
        const entry = await createFaction.mutateAsync({ input, groupId: null });
        // First successful save redirects to edit page for the saved faction.
        navigate({
          to: '/factions/$factionId/edit',
          params: { factionId: entry.data.slug },
        });
        return { slug: entry.data.slug };
        }}
      />
    </>
  );
}
