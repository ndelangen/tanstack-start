import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  FileText,
  Layers3,
  ListTree,
  MessageCircleQuestionMark,
  Pencil,
  ScrollText,
  Trash2,
  UserPlus,
  UserRoundMinus,
  UsersRound,
} from 'lucide-react';

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
import { OptionPicker } from '@app/components/form/OptionPicker';
import { AutoGrid, Stack, Toolbar, ToolbarSearchField } from '@app/components/generic/layout';
import { BlockCover, Card } from '@app/components/generic/surfaces';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { PageLayout } from '@app/components/shell';
import { FAQ_TAG_LABELS, FAQ_TAG_VALUES, type FaqTag } from '@app/faq/tags';

import styles from '../RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug/')({
  validateSearch: (params: Record<string, unknown>): { q?: string; tag?: FaqTag } => {
    const q = params?.q;
    const tag = params?.tag;
    return {
      ...(typeof q === 'string' ? { q } : {}),
      ...(typeof tag === 'string' && FAQ_TAG_VALUES.includes(tag as FaqTag)
        ? { tag: tag as FaqTag }
        : {}),
    };
  },
  loader: async ({ params }) => {
    const detailPage = await loadRulesetDetailPage(params.rulesetSlug);
    if (!detailPage) {
      return { notFound: true as const };
    }
    return { notFound: false as const, detailPage };
  },
  component: RulesetDetailPage,
});

function RulesetDetailPage() {
  const { rulesetSlug } = Route.useParams();
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const detailSeed = loaderData.notFound ? undefined : loaderData.detailPage;
  const page = useRulesetDetailPage(rulesetSlug, { initialData: detailSeed });
  const profile = useCurrentProfile();
  const deleteRuleset = useDeleteRuleset();
  const updateRuleset = useUpdateRuleset();
  const requestMembership = useRequestGroupMembership();

  if (loaderData.notFound || !page.ruleset) {
    return (
      <PageLayout
        header={
          <div>
            <h1>Ruleset</h1>
            <p>
              <Link to="/rulesets">Back to rulesets</Link>
            </p>
          </div>
        }
      >
        <Card>
          <h2>Ruleset not found</h2>
          <p>This ruleset doesn't exist or was deleted.</p>
        </Card>
      </PageLayout>
    );
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
  const answeredFaqCount = page.faqItems.filter((item) => item.accepted_answer_id != null).length;

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
  const handleFaqTagChange = (value: string) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, tag: value === '__all__' ? undefined : (value as FaqTag) }),
      replace: true,
    });
  };

  return (
    <PageLayout
      headerSize="compact"
      header={
        <div className={styles.pageHead}>
          <div className={styles.rulesetHeadCover}>
            <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
          </div>
          <div className={styles.pageHeadText}>
            <h1 className={styles.rulesetTitle}>{r.name}</h1>
            <p className={styles.pageHeadMeta}>
              <Link to="/rulesets">Rulesets</Link> / Content wireframe
            </p>
            <p>
              <strong>Proposed summary:</strong> Add a short explanation of what this ruleset
              changes, includes, and who it is intended for.
            </p>
            <p>
              Maintained by{' '}
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
          </div>
        </div>
      }
      toolbar={
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
          </Toolbar.Left>
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
      }
    >
      <div className={styles.contentColumns}>
        <Stack gap={4} className={styles.mainColumn}>
          {(deleteRuleset.isError || requestMembership.isError || updateRuleset.isError) && (
            <p className={styles.error}>
              {deleteRuleset.error?.message ??
                requestMembership.error?.message ??
                updateRuleset.error?.message}
            </p>
          )}

          <section id="overview" className={styles.section}>
            <h2 className={styles.iconHeading}>
              <BookOpen size={20} aria-hidden /> About this ruleset
            </h2>
            <Card>
              <Stack gap={3}>
                <p className={styles.proposedLabel}>Proposed content · new fields required</p>
                <p>
                  A concise introduction explaining the ruleset's purpose, intended audience, and
                  how it differs from the base game.
                </p>
                <p>
                  Compatibility should identify the base edition or parent ruleset, required
                  expansions, and whether this ruleset can be mixed with other variants.
                </p>
              </Stack>
            </Card>
          </section>

          <section id="rules" className={styles.section}>
            <h2 className={styles.iconHeading}>
              <ScrollText size={20} aria-hidden /> Rules and variants
            </h2>
            <p className={styles.sectionIntro}>
              Proposed structured rule sections would make the ruleset useful before the FAQ has
              accumulated questions.
            </p>
            <div className={styles.proposedRulesGrid}>
              <Card header={<h3>Setup changes</h3>}>
                <p>Changes to preparation, starting resources, map state, and player count.</p>
              </Card>
              <Card header={<h3>Core rule changes</h3>}>
                <p>The rules that override or extend the base game during normal play.</p>
              </Card>
              <Card header={<h3>Victory and end game</h3>}>
                <p>Changed victory conditions, turn limits, tie breakers, or scoring.</p>
              </Card>
              <Card header={<h3>Optional variants</h3>}>
                <p>Clearly optional modules that groups may enable independently.</p>
              </Card>
            </div>
          </section>

          <section id="factions" className={styles.section}>
            <h2 className={styles.iconHeading}>
              <Layers3 size={20} aria-hidden /> Included factions
            </h2>
            {page.factions && page.factions.length > 0 ? (
              <AutoGrid minColumnWidth="220px" gap={3}>
                {page.factions.map((f) => (
                  <Card key={f.factionId} header={<h3>{f.name}</h3>}>
                    <Stack gap={2}>
                      <p className={styles.proposedLabel}>Proposed faction summary</p>
                      <p>One sentence describing its identity and role in this ruleset.</p>
                      <p>
                        <Link to="/factions/$factionId" params={{ factionId: f.urlSlug }}>
                          View faction
                        </Link>
                      </p>
                    </Stack>
                  </Card>
                ))}
              </AutoGrid>
            ) : (
              <Card>
                <p>No factions have been added to this ruleset yet.</p>
              </Card>
            )}
          </section>

          <section id="faq" className={styles.section}>
            <h2 className={styles.iconHeading}>
              <CircleHelp size={20} aria-hidden /> Frequently asked questions
            </h2>
            <div className={styles.faqTools}>
              <ToolbarSearchField
                value={search.q ?? ''}
                onValueChange={handleFaqSearchChange}
                placeholder="Search questions..."
                aria-label="Search FAQ questions"
              />
              <OptionPicker
                value={search.tag ?? '__all__'}
                onValueChange={handleFaqTagChange}
                options={[
                  { value: '__all__', label: 'All tags' },
                  ...FAQ_TAG_VALUES.map((tag) => ({ value: tag, label: FAQ_TAG_LABELS[tag] })),
                ]}
                placeholder="Filter by tag"
                ariaLabel="Filter FAQ by tag"
                appearance="embedded"
              />
            </div>
            <Card>
              <FaqList
                items={page.faqItems}
                rulesetSlug={r.slug}
                searchQuery={search.q ?? ''}
                selectedTag={search.tag}
              />
            </Card>
          </section>
        </Stack>

        <aside className={styles.sidebar} aria-label="Ruleset details">
          <Stack gap={3}>
            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <ListTree size={20} aria-hidden /> At a glance
                </h2>
              }
            >
              <div className={styles.factList}>
                <p>
                  <Layers3 size={18} aria-hidden />
                  <strong>{page.factions?.length ?? 0}</strong>
                  <span>Factions</span>
                </p>
                <p>
                  <CircleHelp size={18} aria-hidden />
                  <strong>{page.faqItems.length}</strong>
                  <span>Questions</span>
                </p>
                <p>
                  <CheckCircle2 size={18} aria-hidden />
                  <strong>{answeredFaqCount}</strong>
                  <span>Answered</span>
                </p>
                <p>
                  <FileText size={18} aria-hidden />
                  <strong>—</strong>
                  <span>Version · proposed</span>
                </p>
              </div>
            </Card>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <ListTree size={20} aria-hidden /> On this page
                </h2>
              }
            >
              <nav aria-label="Ruleset sections">
                <ul className={styles.sectionLinks}>
                  <li>
                    <a href="#overview">About</a>
                  </li>
                  <li>
                    <a href="#rules">Rules and variants</a>
                  </li>
                  <li>
                    <a href="#factions">Factions</a>
                  </li>
                  <li>
                    <a href="#faq">FAQ</a>
                  </li>
                </ul>
              </nav>
            </Card>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <UsersRound size={20} aria-hidden /> Stewardship
                </h2>
              }
            >
              <Stack gap={2}>
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
                {r.group_id == null ? (
                  <p className={styles.muted}>No maintaining group.</p>
                ) : !assignedGroup ? (
                  <p className={styles.muted}>Group unavailable.</p>
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
                      Your membership:{' '}
                      {membershipStatus === 'active'
                        ? 'Active'
                        : membershipStatus === 'pending'
                          ? 'Pending'
                          : 'Not a member'}
                    </p>
                    {!profile.isPending && !profileUserId ? (
                      <p>
                        <Link to="/auth/login">Log in</Link> to join.
                      </p>
                    ) : null}
                    {canRequestMembership ? (
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
                    ) : null}
                  </>
                )}
              </Stack>
            </Card>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <FileText size={20} aria-hidden /> Resources
                </h2>
              }
            >
              <Stack gap={2}>
                <p className={styles.proposedLabel}>Proposed content</p>
                <p>Printable rules, release notes, and a version history could live here.</p>
              </Stack>
            </Card>
          </Stack>
        </aside>
      </div>
    </PageLayout>
  );
}
