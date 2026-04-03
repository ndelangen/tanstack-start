import { createFileRoute, Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { MessageCircleQuestionMark, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { FaqItemWithDetails } from '@db/faq';
import { useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import {
  loadRulesetDetailPage,
  type RulesetDetailPageData,
  useDeleteRuleset,
  useRulesetDetailPage,
  useUpdateRuleset,
} from '@db/rulesets';
import { FaqList } from '@app/components/faq/FaqList';
import { FormActions } from '@app/components/form/FormActions';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Toolbar } from '@app/components/generic/layout';
import { BlockCover } from '@app/components/generic/surfaces';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';

import styles from './RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug')({
  validateSearch: (params: Record<string, unknown>): { q?: string } => {
    const q = params?.q;
    return typeof q === 'string' ? { q } : {};
  },
  loader: async ({ params }) => {
    try {
      const detailPage = await loadRulesetDetailPage(params.rulesetSlug);
      return { notFound: false as const, detailPage };
    } catch {
      return { notFound: true as const };
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

function RulesetGroupAccessExpanded({
  groupId,
  groupAccess,
  profileUserId,
  requestMembership,
}: {
  groupId: string;
  groupAccess: RulesetDetailPageData['groupAccess'];
  profileUserId: string | undefined;
  requestMembership: ReturnType<typeof useRequestGroupMembership>;
}) {
  const group = groupAccess?.group;
  const members = groupAccess?.members ?? [];
  const viewerMembership = members.find(
    (entry) => entry.membership.user_id === profileUserId
  )?.membership;
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = !!profileUserId && !!group && membershipStatus === 'none';

  if (!group) {
    return (
      <div className={styles.toolbarGroupAccess}>
        <span className={styles.groupStatusLabel}>Group access:</span>
        <span>Group details unavailable.</span>
      </div>
    );
  }

  const groupDisplay =
    membershipStatus === 'active' && group.slug ? (
      <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
        {group.name}
      </Link>
    ) : (
      <span>{group.name}</span>
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
            Request
          </UIButton>
        </FormTooltip>
      )}
    </div>
  );
}

function RulesetFaqSection({
  rulesetSlug,
  faqItems,
  searchQuery,
}: {
  rulesetSlug: string;
  faqItems: FaqItemWithDetails[];
  searchQuery: string;
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>FAQ</h3>
      <Card>
        <FaqList items={faqItems} rulesetSlug={rulesetSlug} searchQuery={searchQuery} />
      </Card>
    </section>
  );
}

function RulesetDetailPage() {
  const { rulesetSlug } = Route.useParams();
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const matches = useMatches();
  const [groupAccessOpen, setGroupAccessOpen] = useState(false);
  const hasFaqChildRoute = matches.some((m) => m.pathname.includes('/faq/'));
  const detailSeed = loaderData.notFound ? undefined : loaderData.detailPage;
  const page = useRulesetDetailPage(rulesetSlug, { initialData: detailSeed });
  const profile = useCurrentProfile();
  const deleteRuleset = useDeleteRuleset();
  const updateRuleset = useUpdateRuleset();
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

  if (!page.ruleset) {
    return null;
  }

  if (hasFaqChildRoute) {
    return <Outlet />;
  }

  const r = page.ruleset;
  const isOwner = profile?.data?.user_id === r.owner_id;

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

        {r.group_id == null ? (
          <div className={styles.toolbarGroupAccess}>
            <span className={styles.groupStatusLabel}>Group access:</span>
            <span>No group</span>
          </div>
        ) : !groupAccessOpen ? (
          <div className={styles.toolbarGroupAccess}>
            <span className={styles.groupStatusLabel}>Group access:</span>
            <span>This ruleset is linked to a group.</span>
            <UIButton type="button" variant="secondary" onClick={() => setGroupAccessOpen(true)}>
              Show details
            </UIButton>
          </div>
        ) : (
          <RulesetGroupAccessExpanded
            groupId={r.group_id}
            groupAccess={page.groupAccess}
            profileUserId={profile.data?.user_id}
            requestMembership={requestMembership}
          />
        )}
        {(deleteRuleset.isError || requestMembership.isError) && (
          <p className={styles.error}>
            {deleteRuleset.error?.message ?? requestMembership.error?.message}
          </p>
        )}
      </section>
      {page.factions && page.factions.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Factions in this ruleset</h3>
          <ul>
            {page.factions.map((f) => (
              <li key={f.factionId}>
                <Link to="/factions/$factionId" params={{ factionId: f.urlSlug }}>
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <RulesetFaqSection
        rulesetSlug={r.slug}
        faqItems={page.faqItems}
        searchQuery={search.q ?? ''}
      />
    </>
  );
}
