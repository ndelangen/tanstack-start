import {
  createFileRoute,
  getRouteApi,
  Link,
  Outlet,
  useMatches,
  useNavigate,
} from '@tanstack/react-router';
import { MessageCircleQuestionMark, Search, Trash2 } from 'lucide-react';

import { loadFaqItemsByRuleset, useFaqItemsByRuleset } from '@db/faq';
import { useGroup } from '@db/groups';
import { useGroupMembers, useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import {
  loadRulesetBySlug,
  useDeleteRuleset,
  useRulesetBySlug,
  useUpdateRuleset,
} from '@db/rulesets';
import { FaqList } from '@app/components/faq/FaqList';
import { FormActions } from '@app/components/form/FormActions';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Toolbar } from '@app/components/generic/layout';
import { BlockCover } from '@app/components/generic/surfaces';
import { Card } from '@app/components/generic/surfaces/Card';
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';

import styles from './RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug')({
  validateSearch: (params: Record<string, unknown>): { q?: string } => {
    const q = params?.q;
    return typeof q === 'string' ? { q } : {};
  },
  loader: async ({ params }) => {
    try {
      const rulesetPage = await loadRulesetBySlug(params.rulesetSlug);
      if (rulesetPage) {
        const [faqItems] = await Promise.all([loadFaqItemsByRuleset(rulesetPage.ruleset._id)]);
        return { notFound: false, rulesetPage, faqItems };
      }
      return { notFound: false, rulesetPage: undefined, faqItems: [] };
    } catch {
      return { notFound: true };
    }
  },
  component: RulesetDetailPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Ruleset</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    ),
  },
});

const appRouteApi = getRouteApi('/_app');

function RulesetDetailPage() {
  const { rulesetSlug } = Route.useParams();
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const matches = useMatches();
  const hasFaqChildRoute = matches.some((m) => m.pathname.includes('/faq/'));
  const rulesetSeed = loaderData.notFound ? undefined : loaderData.rulesetPage;
  const faqItemsSeed = loaderData.notFound ? undefined : loaderData.faqItems;
  const ruleset = useRulesetBySlug(rulesetSlug, { initialData: rulesetSeed });
  const appLoaderData = appRouteApi.useLoaderData();
  const profile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });
  const deleteRuleset = useDeleteRuleset();
  const updateRuleset = useUpdateRuleset();
  const rulesetId = ruleset.ruleset?._id ?? '';
  const faqItems = useFaqItemsByRuleset(rulesetId, { initialData: faqItemsSeed });
  const groupId = ruleset.ruleset?.group_id ?? '';
  const group = useGroup(groupId);
  const groupMembers = useGroupMembers(groupId);
  const requestMembership = useRequestGroupMembership();

  if (loaderData?.notFound) {
    return (
      <div>
        <h2>Ruleset not found</h2>
        <p>This ruleset doesn&apos;t exist or was deleted.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  if (!ruleset.ruleset) {
    return null;
  }

  if (hasFaqChildRoute) {
    return <Outlet />;
  }

  const r = ruleset.ruleset;
  const isOwner = profile?.data?.user_id === r.owner_id;
  const viewerMembership = groupMembers.data?.find(
    (entry) => entry.user_id === profile.data?.user_id
  );
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership =
    r.group_id != null && !!profile.data?.user_id && membershipStatus === 'none';

  const handleDelete = () => {
    if (!window.confirm(`Delete ruleset "${r.name}"? This cannot be undone.`)) return;
    deleteRuleset.mutate(r._id, {
      onSuccess: () => navigate({ to: '/rulesets' }),
    });
  };

  const handleFaqSearchChange = (value: string) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, q: value.trim() || undefined }),
      replace: true,
    });
  };

  return (
    <>
      <Toolbar>
        <Toolbar.Left>
          {profile?.data?._id && (
            <FormTooltip content="Ask a question">
              <UIButton
                type="button"
                iconOnly
                aria-label="Ask a question"
                onClick={() =>
                  navigate({
                    to: '/rulesets/$rulesetSlug/faq/create',
                    params: { rulesetSlug: r.slug },
                  })
                }
              >
                <MessageCircleQuestionMark size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          )}
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={search.q ?? ''}
              onChange={(e) => handleFaqSearchChange(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search FAQ questions"
            />
          </div>
        </Toolbar.Left>
        <Toolbar.Center></Toolbar.Center>
        <Toolbar.Right>
          {isOwner && (
            <GroupAssignPopover
              disabled={!isOwner}
              onChangeGroup={async (nextGroupId) => {
                await updateRuleset.mutateAsync({
                  id: r._id,
                  input: { name: r.name },
                  groupId: nextGroupId,
                  imageCover: r.image_cover ?? null,
                });
              }}
              title="Assign Group"
              descriptionLines={[
                `Assign a group that can help maintain "${r.name}".`,
                'You can create and join groups from your profile.',
              ]}
            />
          )}

          <FormActions>
            {isOwner && (
              <FormTooltip content="Delete ruleset">
                <UIButton
                  variant="critical"
                  type="button"
                  iconOnly
                  aria-label="Delete ruleset"
                  onClick={handleDelete}
                  disabled={deleteRuleset.isPending}
                >
                  <Trash2 size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            )}
          </FormActions>
        </Toolbar.Right>
      </Toolbar>
      <section className={styles.section}>
        <div className={styles.coverWrapper}>
          <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
        </div>
        <h2>{r.name}</h2>

        {(() => {
          const groupDisplay =
            r.group_id == null ? (
              <span>No group</span>
            ) : membershipStatus === 'active' && group.data?.slug ? (
              <Link to="/groups/$groupSlug" params={{ groupSlug: group.data.slug }}>
                {group.data?.name ?? 'Group'}
              </Link>
            ) : (
              <span>{group.data?.name ?? 'Loading group...'}</span>
            );

          const membershipLabel =
            membershipStatus === 'active'
              ? 'Active member'
              : membershipStatus === 'pending'
                ? 'Pending approval'
                : 'Not a member';

          return (
            <div className={styles.toolbarGroupAccess}>
              <span className={styles.groupStatusLabel}>Group access:</span>
              {groupDisplay}
              <span aria-hidden>·</span>
              <span>{membershipLabel}</span>
              {canRequestMembership && (
                <FormTooltip content="Request membership">
                  <UIButton
                    type="button"
                    iconOnly
                    aria-label="Request membership"
                    disabled={requestMembership.isPending}
                    onClick={() => requestMembership.mutate(groupId)}
                  >
                    {/* Reuse UserPlus icon via Faq toolbar import if desired; currently using generic button */}
                    Request
                  </UIButton>
                </FormTooltip>
              )}
            </div>
          );
        })()}
        {(deleteRuleset.isError || requestMembership.isError) && (
          <p className={styles.error}>
            {deleteRuleset.error?.message ?? requestMembership.error?.message}
          </p>
        )}
      </section>
      {ruleset.factions && ruleset.factions.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Factions in this ruleset</h3>
          <ul>
            {ruleset.factions.map((f) => (
              <li key={f.factionId}>
                <Link to="/factions/$factionId" params={{ factionId: f.urlSlug }}>
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>FAQ</h3>
        <Card>
          <FaqList items={faqItems.data ?? []} rulesetSlug={r.slug} searchQuery={search.q ?? ''} />
        </Card>
      </section>
    </>
  );
}
