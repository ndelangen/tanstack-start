import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { RotateCcw, Save, Trash2, UserRoundMinus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  type Faction,
  useDeleteFaction,
  useFaction,
  useSetFactionGroup,
  useUpdateFaction,
} from '@db/factions';
import { useCurrentProfile } from '@db/profiles';
import {
  FactionEditor,
  type FactionEditorHandle,
} from '@app/components/factions/editor/FactionEditor';
import styles from '@app/components/factions/editor/FactionEditor.module.css';
import { FactionGroupPopover } from '@app/components/factions/editor/FactionGroupPopover';
import { FactionLoadPopover } from '@app/components/factions/editor/FactionLoadPopover';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { loadFaction } from '@app/factions/db';
import { FactionInputSchema, FactionStoredSchema, factionSlugBaseFromName } from '@game/schema/faction';

export const Route = createFileRoute('/_app/factions/$factionId/edit')({
  loader: async ({ params }) => await loadFaction(params.factionId),
  component: FactionEditPage,
});

const appRouteApi = getRouteApi('/_app');

function formatZodIssues(err: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return err.issues
    .map((i) => `${i.path.map((segment) => String(segment)).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

function FactionEditPage() {
  const { factionId } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const editorRef = useRef<FactionEditorHandle | null>(null);
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();
  const setFactionGroup = useSetFactionGroup();
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
  });
  const [editorErrors, setEditorErrors] = useState<string[]>([]);

  const { faction, group } = useFaction(factionId, {
    enabled: !!factionId,
    initialData: loaderData,
  });
  if (!profile?.data?.user_id) {
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

  if (!faction) {
    return null;
  }

  const { slug: _ignored, ...initialFactionInput } = faction.data;

  const canDelete = faction.owner_id === profile.data.user_id;
  const canAssignGroup = canDelete;

  const handleEditorSubmit = (values: Faction) => {
    const parsed = FactionInputSchema.safeParse(values);
    if (!parsed.success) {
      setEditorErrors([formatZodIssues(parsed.error)]);
      return;
    }
    setEditorErrors([]);
    void (async () => {
      const entry = await updateFaction.mutateAsync({ input: parsed.data, id: faction._id });
      const newSlug = entry.data.slug;
      if (newSlug !== factionId) {
        navigate({
          to: '/factions/$factionId/edit',
          params: { factionId: newSlug },
          replace: true,
        });
      }
    })();
  };

  return (
    <>
      <Toolbar>
        <Toolbar.Left>
          <FormTooltip content="Save changes">
            <UIButton
              type="button"
              iconOnly
              aria-label="Save changes"
              disabled={false}
              onClick={() => editorRef.current?.submit()}
            >
              <Save size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
          <FactionLoadPopover
            disabled={false}
            currentValues={initialFactionInput}
            onLoaded={(loaded) => {
              const data = FactionStoredSchema.parse({
                ...loaded,
                slug: factionSlugBaseFromName(loaded.name ?? ''),
              });
              editorRef.current?.load(data);
            }}
          />
          {canAssignGroup && !group && (
            <FactionGroupPopover
              disabled={false}
              onChangeGroup={async (nextGroupId) => {
                await setFactionGroup.mutateAsync({ id: faction._id, groupId: nextGroupId });
              }}
            />
          )}
          {canAssignGroup && group && (
            <FormTooltip content="Remove group">
              <UIButton
                type="button"
                iconOnly
                aria-label="Remove group"
                disabled={false}
                variant="critical"
                onClick={() => setFactionGroup.mutateAsync({ id: faction._id, groupId: null })}
              >
                <UserRoundMinus size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          )}

          <FormTooltip content="Reset unsaved edits">
            <UIButton
              type="button"
              variant="critical"
              iconOnly
              aria-label="Reset unsaved edits"
              disabled={false}
              onClick={() => editorRef.current?.load()}
            >
              <RotateCcw size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
        </Toolbar.Left>

        <Toolbar.Right>
          {group ? (
            <div className={styles.toolbarGroupAccess}>
              <span className={styles.groupStatusLabel}>Group access:</span>{' '}
              <span>{group.name ?? group._id}</span>
            </div>
          ) : null}
          <FormTooltip content="Close editor">
            <UIButton
              type="button"
              variant="critical"
              iconOnly
              aria-label="Close editor"
              disabled={false}
              onClick={() =>
                navigate({
                  to: '/factions/$factionId',
                  params: { factionId },
                })
              }
            >
              <X size={16} aria-hidden />
            </UIButton>
          </FormTooltip>
          {canDelete && (
            <FormTooltip content="Delete faction">
              <UIButton
                type="button"
                variant="critical"
                iconOnly
                aria-label="Delete faction"
                disabled={false}
                onClick={() => {
                  if (!window.confirm('Delete this faction? It will be hidden from lists.')) return;
                  void (async () => {
                    await deleteFaction.mutateAsync({ id: faction._id });
                    navigate({ to: '/factions' });
                  })();
                }}
              >
                <Trash2 size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          )}
        </Toolbar.Right>
      </Toolbar>
      <FactionEditor
        key={faction._id}
        ref={editorRef}
        factionEntry={faction}
        errors={editorErrors}
        onSubmit={handleEditorSubmit}
      />
    </>
  );
}
