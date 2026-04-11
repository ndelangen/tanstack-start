import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
} from '@tanstack/react-router';
import {
  MessageCircleQuestionMark,
  Pencil,
  Trash2,
  UserPlus,
  UserRoundMinus,
} from 'lucide-react';

import type { FaqItemWithDetails } from '@db/faq';
import { useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import {
  loadRulesetDetailPage,
  useDeleteRuleset,
  useRulesetDetailPage,
  useUpdateRuleset,
} from '@db/rulesets';
import { FaqList } from '@app/components/faq/FaqList';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack, Toolbar, ToolbarSearchField } from '@app/components/generic/layout';
import { BlockCover } from '@app/components/generic/surfaces';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';
import { ProfileLink } from '@app/components/profile/ProfileLink';

import styles from './RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug')({
  validateSearch: (params: Record<string, unknown>): { q?: string } => {
    const q = params?.q;
    return typeof q === 'string' ? { q } : {};
  },
  loader: async ({ params }) => {
    const detailPage = await loadRulesetDetailPage(params.rulesetSlug);
    if (!detailPage) {
      return { notFound: true as const };
    }
    return { notFound: false as const, detailPage };
  },
  component: RulesetDetailPage,
  staticData: {
    PageHead: RulesetPageHead,
  },
});

function RulesetPageHead() {
  const { rulesetSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const detailSeed = loaderData.notFound ? undefined : loaderData.detailPage;
  const page = useRulesetDetailPage(rulesetSlug, { initialData: detailSeed });

  if (loaderData.notFound || !page.ruleset) {
    return (
      <div>
        <h1>Ruleset</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  const r = page.ruleset;
  return (
    <div className={styles.pageHead}>
      <div className={styles.rulesetHeadCover}>
        <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
      </div>
      <div className={styles.pageHeadText}>
        <h1 className={styles.rulesetTitle}>{r.name}</h1>
        <p className={styles.pageHeadMeta}>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
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
  const location = useLocation();
  const matches = useMatches();
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
        <p>This ruleset doesn't exist or was deleted.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  if (!page.ruleset) {
    return (
      <div>
        <h2>Ruleset not found</h2>
        <p>This ruleset doesn't exist or was deleted.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  if (hasFaqChildRoute || location.pathname.endsWith('/edit')) {
    return <Outlet />;
  }

  const r = page.ruleset;
  const isOwner = profile?.data?.user_id === r.owner_id;

  const profileUserId = profile.data?.user_id;
  const assignedGroup = page.groupAccess?.group;
  const groupMembersList = page.groupAccess?.members ?? [];
  const viewerMembership = groupMembersList.find(
    (entry) => entry.membership.user_id === profileUserId
  )?.membership;
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = !!profileUserId && !!assignedGroup && membershipStatus === 'none';

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
    <Stack gap={4}>
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
          <ToolbarSearchField
            value={search.q ?? ''}
            onValueChange={handleFaqSearchChange}
            placeholder="Search questions..."
            aria-label="Search FAQ questions"
          />
        </Toolbar.Left>
        <Toolbar.Center></Toolbar.Center>
        <Toolbar.Right>
          {isOwner && (
            <FormTooltip content="Edit ruleset">
              <UIButton
                variant="secondary"
                to="/rulesets/$rulesetSlug/edit"
                params={{ rulesetSlug: r.slug }}
                aria-label="Edit ruleset"
              >
                <Pencil size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          )}
          {isOwner &&
            (r.group_id == null ? (
              <GroupAssignPopover
                disabled={!isOwner}
                prefetchedMemberships={page.viewerAssignableMemberships}
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
            ) : (
              <FormTooltip content="Remove group">
                <UIButton
                  type="button"
                  iconOnly
                  aria-label="Remove group"
                  variant="critical"
                  disabled={updateRuleset.isPending}
                  onClick={() =>
                    void updateRuleset.mutateAsync({
                      id: r._id,
                      input: { name: r.name },
                      groupId: null,
                      imageCover: r.image_cover ?? null,
                    })
                  }
                >
                  <UserRoundMinus size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            ))}

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
        </Toolbar.Right>
      </Toolbar>
      <section className={styles.section}>
        <p>
          Owner:{' '}
          {page.owner ? (
            <ProfileLink
              slug={page.owner.slug}
              username={page.owner.username}
              avatar_url={page.owner.avatar_url}
            />
          ) : (
            <span>Unknown</span>
          )}
        </p>

        {(deleteRuleset.isError || requestMembership.isError || updateRuleset.isError) && (
          <p className={styles.error}>
            {deleteRuleset.error?.message ??
              requestMembership.error?.message ??
              updateRuleset.error?.message}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Group</h3>
        {r.group_id == null ? (
          <p>This ruleset is not assigned to a group.</p>
        ) : !assignedGroup ? (
          <p>Group details unavailable.</p>
        ) : (
          <>
            <p>
              Group:{' '}
              {assignedGroup.slug ? (
                <Link to="/groups/$groupSlug" params={{ groupSlug: assignedGroup.slug }}>
                  {assignedGroup.name}
                </Link>
              ) : (
                <strong>{assignedGroup.name}</strong>
              )}
            </p>
            <p>
              Membership status:{' '}
              {membershipStatus === 'active'
                ? 'Active member'
                : membershipStatus === 'pending'
                  ? 'Pending approval'
                  : 'Not a member'}
            </p>
            {membershipStatus === 'pending' && (
              <p>Your membership request is waiting for approval.</p>
            )}
            {!profile.isPending && !profileUserId && (
              <p>
                <Link to="/auth/login">Log in</Link> to request membership.
              </p>
            )}
            {canRequestMembership && (
              <FormTooltip content="Request membership">
                <UIButton
                  type="button"
                  iconOnly
                  aria-label="Request membership"
                  disabled={requestMembership.isPending}
                  onClick={() => requestMembership.mutate(assignedGroup._id)}
                >
                  <UserPlus size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            )}
            {requestMembership.isError && <p>{requestMembership.error?.message}</p>}
          </>
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
    </Stack>
  );
}
