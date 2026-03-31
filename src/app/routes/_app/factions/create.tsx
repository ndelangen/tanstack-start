import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { RotateCcw, Save, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { type Faction, type FactionEntry, useCreateFaction } from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import {
  FactionEditor,
  type FactionEditorHandle,
} from '@app/components/factions/editor/FactionEditor';
import styles from '@app/components/factions/editor/FactionEditor.module.css';
import { FactionLoadPopover } from '@app/components/factions/editor/FactionLoadPopover';
import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { defaultFaction } from '@data/defaultFaction';
import { FactionInputSchema } from '@game/schema/faction';

export const Route = createFileRoute('/_app/factions/create')({
  component: CreateFactionPage,
});

function toSyntheticFactionEntry(
  defaultFactionData: typeof defaultFaction,
  ownerId: string
): FactionEntry {
  // Minimal synthetic entry; slug is derived from name.
  return {
    _id: 'new' as never,
    _creationTime: Date.now(),
    owner_id: ownerId as never,
    data: {
      ...defaultFactionData,
      slug: defaultFactionData.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'faction',
    },
    slug: defaultFactionData.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'faction',
    group_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    id: 'new',
  };
}

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

function CreateFactionPage() {
  const navigate = useNavigate();
  const profile = useCurrentProfile();
  const createFaction = useCreateFaction();
  const editorRef = useRef<FactionEditorHandle | null>(null);
  const [editorErrors, setEditorErrors] = useState<string[]>([]);

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

  const handleEditorSubmit = (values: Faction) => {
    const parsed = FactionInputSchema.safeParse(values);
    if (!parsed.success) {
      setEditorErrors([formatZodIssues(parsed.error)]);
      return;
    }
    setEditorErrors([]);
    void (async () => {
      const entry = await createFaction.mutateAsync({ input: parsed.data, groupId: null });
      navigate({
        to: '/factions/$factionId/edit',
        params: { factionId: entry.data.slug },
      });
    })();
  };

  return (
    <>
      <Toolbar>
        <Toolbar.Left>
          <FormTooltip content="Save changes">
            <FormButton
              type="button"
              iconOnly
              aria-label="Save changes"
              disabled={false}
              onClick={() => editorRef.current?.submit()}
            >
              <Save size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
          <FactionLoadPopover
            disabled={false}
            currentValues={defaultFaction}
            onLoaded={() => {
              // Page will handle reloading the editor via props/remount if desired.
              // For now this is a no-op placeholder; routes can wire a callback later if needed.
            }}
          />
          <FormTooltip content="Reset unsaved edits">
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label="Reset unsaved edits"
              disabled={false}
              onClick={() => editorRef.current?.resetToInitial()}
            >
              <RotateCcw size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
        </Toolbar.Left>

        <Toolbar.Right>
          <p>You'll be able to assign it to a group after the first save.</p>
          <FormTooltip content="Close editor">
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label="Close editor"
              disabled={false}
              onClick={() => navigate({ to: '/factions' })}
            >
              <X size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
        </Toolbar.Right>
      </Toolbar>
      <FactionEditor
        key="create"
        ref={editorRef}
        factionEntry={syntheticEntry}
        errors={editorErrors}
        onSubmit={handleEditorSubmit}
      />
    </>
  );
}
