import { createFileRoute, Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { MessageCircleQuestionMark, Search, Trash2, UserPlus } from 'lucide-react';

import { faqItemsByRulesetQueryOptions, useFaqItemsByRuleset } from '@db/faq';
import { useGroup } from '@db/groups';
import { useGroupMembers, useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import {
  rulesetBySlugQueryOptions,
  rulesetFactionsWithDetailsQueryOptions,
  useDeleteRuleset,
  useRulesetBySlug,
  useRulesetFactionsWithDetails,
} from '@db/rulesets';
import { FaqList } from '@app/components/faq/FaqList';
import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { BlockCover } from '@app/components/generic/surfaces';
import { Card } from '@app/components/generic/surfaces/Card';

import styles from './RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug')({
  validateSearch: (params: Record<string, unknown>): { q?: string } => {
    const q = params?.q;
    return typeof q === 'string' ? { q } : {};
  },
  loader: async ({ context, params }) => {
    try {
      const ruleset = await context.queryClient.ensureQueryData(
        rulesetBySlugQueryOptions(params.rulesetSlug)
      );
      if (ruleset) {
        await Promise.all([
          context.queryClient.ensureQueryData(faqItemsByRulesetQueryOptions(ruleset.id)),
          context.queryClient.ensureQueryData(rulesetFactionsWithDetailsQueryOptions(ruleset.id)),
        ]);
      }
      return { notFound: false };
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

function RulesetDetailPage() {
  const { rulesetSlug } = Route.useParams();
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const matches = useMatches();
  const hasFaqChildRoute = matches.some((m) => m.pathname.includes('/faq/'));
  const ruleset = useRulesetBySlug(rulesetSlug);
  const profile = useCurrentProfile();
  const deleteRuleset = useDeleteRuleset();
  const rulesetId = ruleset.data?._id ?? '';
  const factions = useRulesetFactionsWithDetails(rulesetId);
  const faqItems = useFaqItemsByRuleset(rulesetId);
  const groupId = ruleset.data?.group_id ?? '';
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

  if (!ruleset.data) {
    return null;
  }

  if (hasFaqChildRoute) {
    return <Outlet />;
  }

  const r = ruleset.data;
  const isOwner = profile?.data?.id === r.owner_id;
  const viewerMembership = groupMembers.data?.find((entry) => entry.user_id === profile.data?.id);
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership =
    r.group_id != null && !!profile.data?.id && membershipStatus === 'none';

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
      <section className={styles.section}>
        <div className={styles.coverWrapper}>
          <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
        </div>
        <h2>{r.name}</h2>
        <div className={styles.toolbar}>
          <div className={styles.toolbarActions}>
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
            <FormActions>
              {profile?.data?.id && (
                <FormTooltip content="Ask a question">
                  <FormButton
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
                  </FormButton>
                </FormTooltip>
              )}
              {isOwner && (
                <FormTooltip content="Delete ruleset">
                  <FormButton
                    variant="danger"
                    type="button"
                    iconOnly
                    aria-label="Delete ruleset"
                    onClick={handleDelete}
                    disabled={deleteRuleset.isPending}
                  >
                    <Trash2 size={16} aria-hidden />
                  </FormButton>
                </FormTooltip>
              )}
            </FormActions>
          </div>
          <div className={styles.toolbarGroupAccess}>
            <span className={styles.groupStatusLabel}>Group access:</span>
            {r.group_id == null ? (
              <span>No group</span>
            ) : membershipStatus === 'active' && group.data?.slug ? (
              <Link to="/groups/$groupSlug" params={{ groupSlug: group.data.slug }}>
                {group.data.name}
              </Link>
            ) : (
              <span>{group.data?.name ?? 'Loading group...'}</span>
            )}
            <span aria-hidden>·</span>
            <span>
              {membershipStatus === 'active'
                ? 'Active member'
                : membershipStatus === 'pending'
                  ? 'Pending approval'
                  : 'Not a member'}
            </span>
            {!profile.data?.id && (
              <>
                <span aria-hidden>·</span>
                <Link to="/auth/login">Log in</Link>
              </>
            )}
            {canRequestMembership && (
              <FormTooltip content="Request membership">
                <FormButton
                  type="button"
                  iconOnly
                  aria-label="Request membership"
                  disabled={requestMembership.isPending}
                  onClick={() => requestMembership.mutate(groupId)}
                >
                  <UserPlus size={16} aria-hidden />
                </FormButton>
              </FormTooltip>
            )}
          </div>
        </div>
        {(deleteRuleset.isError || requestMembership.isError) && (
          <p className={styles.error}>
            {deleteRuleset.error?.message ?? requestMembership.error?.message}
          </p>
        )}
      </section>

      {factions.data && factions.data.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Factions in this ruleset</h3>
          <ul>
            {factions.data.map((f) => (
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
