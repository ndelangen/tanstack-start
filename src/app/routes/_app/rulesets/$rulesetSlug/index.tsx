import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  NavLink,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
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
  Search,
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
import { GroupAssignPopover } from '@app/components/groups/GroupAssignPopover';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { PageLayout } from '@app/components/shell';
import { TopicIcon } from '@app/components/topics/TopicIcon';
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
          <Stack align="center" gap="xs">
            <Title order={1}>Ruleset</Title>
            <Anchor renderRoot={(rootProps) => <Link {...rootProps} to="/rulesets" />}>
              Back to rulesets
            </Anchor>
          </Stack>
        }
      >
        <Paper withBorder p="xl" radius="md">
          <Stack gap="xs">
            <Title order={2}>Ruleset not found</Title>
            <Text c="dimmed">This ruleset does not exist or was deleted.</Text>
          </Stack>
        </Paper>
      </PageLayout>
    );
  }

  const r = page.ruleset;
  const isOwner = profile.data?.user_id === r.owner_id;
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
  const mutationError =
    deleteRuleset.error?.message ??
    requestMembership.error?.message ??
    updateRuleset.error?.message;

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

  const handleFaqTagChange = (value: string | null) => {
    navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        tag: value == null || value === '__all__' ? undefined : (value as FaqTag),
      }),
      replace: true,
    });
  };

  return (
    <PageLayout
      headerSize="compact"
      header={
        <Group wrap="nowrap" align="center" gap="lg" className={styles.pageHead}>
          <Paper className={styles.rulesetHeadCover} radius="md" withBorder>
            {r.image_cover ? (
              <Image
                src={r.image_cover}
                alt={`Cover for ${r.name}`}
                className={styles.coverImage}
              />
            ) : (
              <Text size="xs" c="dimmed" ta="center" px="xs">
                No cover
              </Text>
            )}
          </Paper>
          <Stack gap={6} className={styles.pageHeadText}>
            <Group gap="xs" wrap="wrap">
              <Anchor
                size="sm"
                fw={600}
                renderRoot={(rootProps) => <Link {...rootProps} to="/rulesets" />}
              >
                Rulesets
              </Anchor>
              <Text size="sm" c="dimmed">
                / Content wireframe
              </Text>
            </Group>
            <Title order={1} className={styles.rulesetTitle}>
              {r.name}
            </Title>
            <Text size="sm" maw={620}>
              <Text component="span" inherit fw={700}>
                Proposed summary:
              </Text>{' '}
              Add a short explanation of what this ruleset changes, includes, and who it is intended
              for.
            </Text>
            <Group gap="xs" wrap="wrap">
              <Text size="sm" c="dimmed">
                Maintained by
              </Text>
              {page.owner ? (
                <ProfileLink
                  slug={page.owner.slug}
                  username={page.owner.username}
                  avatar_url={page.owner.avatar_url}
                />
              ) : (
                <Text size="sm">Unknown</Text>
              )}
            </Group>
          </Stack>
        </Group>
      }
      toolbar={
        profile.data?._id ? (
          <Paper withBorder p="sm" radius="md">
            <Group justify="space-between" gap="sm" wrap="wrap">
              <Group gap="xs">
                <Button
                  type="button"
                  leftSection={<MessageCircleQuestionMark size={17} aria-hidden />}
                  onClick={() =>
                    navigate({
                      to: '/rulesets/$rulesetSlug/faq/create',
                      params: { rulesetSlug: r.slug },
                    })
                  }
                >
                  Ask a question
                </Button>
              </Group>

              {isOwner ? (
                <Group gap="xs" aria-label="Ruleset owner actions">
                  <Button
                    variant="default"
                    leftSection={<Pencil size={16} aria-hidden />}
                    renderRoot={(rootProps) => (
                      <Link
                        {...rootProps}
                        to="/rulesets/$rulesetSlug/edit"
                        params={{ rulesetSlug: r.slug }}
                      />
                    )}
                  >
                    Edit
                  </Button>
                  {r.group_id == null ? (
                    <GroupAssignPopover
                      disabled={!isOwner || updateRuleset.isPending}
                      userId={profileUserId}
                      isUserPending={profile.isPending}
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
                    <Tooltip label="Remove group">
                      <ActionIcon
                        type="button"
                        aria-label="Remove group"
                        color="red"
                        variant="light"
                        size="lg"
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
                        <UserRoundMinus size={17} aria-hidden />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Delete ruleset">
                    <ActionIcon
                      color="red"
                      variant="filled"
                      type="button"
                      size="lg"
                      aria-label="Delete ruleset"
                      onClick={handleDelete}
                      disabled={deleteRuleset.isPending}
                    >
                      <Trash2 size={17} aria-hidden />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ) : null}
            </Group>
          </Paper>
        ) : undefined
      }
    >
      <Grid gap="xl" align="flex-start">
        <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 2, md: 1 }}>
          <Stack gap="xl">
            {mutationError ? (
              <Alert color="red" title="The change could not be saved" role="alert">
                {mutationError}
              </Alert>
            ) : null}

            <Stack component="section" id="overview" aria-labelledby="overview-heading" gap="md">
              <SectionHeading id="overview-heading" icon={<BookOpen size={20} aria-hidden />}>
                About this ruleset
              </SectionHeading>
              <Paper withBorder p="lg" radius="md">
                <Stack gap="sm">
                  <Badge variant="light" color="dune" w="fit-content">
                    Proposed content · new fields required
                  </Badge>
                  <Text>
                    A concise introduction explaining the ruleset&apos;s purpose, intended audience,
                    and how it differs from the base game.
                  </Text>
                  <Text c="dimmed">
                    Compatibility should identify the base edition or parent ruleset, required
                    expansions, and whether this ruleset can be mixed with other variants.
                  </Text>
                </Stack>
              </Paper>
            </Stack>

            <Stack component="section" id="rules" aria-labelledby="rules-heading" gap="md">
              <Stack gap={4}>
                <SectionHeading id="rules-heading" icon={<TopicIcon topic="rules" size={20} />}>
                  Rules and variants
                </SectionHeading>
                <Text c="dimmed" size="sm">
                  Proposed structured rule sections would make the ruleset useful before the FAQ has
                  accumulated questions.
                </Text>
              </Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {[
                  [
                    'Setup changes',
                    'Changes to preparation, starting resources, map state, and player count.',
                  ],
                  [
                    'Core rule changes',
                    'The rules that override or extend the base game during normal play.',
                  ],
                  [
                    'Victory and end game',
                    'Changed victory conditions, turn limits, tie breakers, or scoring.',
                  ],
                  [
                    'Optional variants',
                    'Clearly optional modules that groups may enable independently.',
                  ],
                ].map(([title, description]) => (
                  <Card key={title} withBorder padding="lg" radius="md">
                    <Stack gap="xs">
                      <Title order={3} size="h4">
                        {title}
                      </Title>
                      <Text size="sm" c="dimmed">
                        {description}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>

            <Stack component="section" id="factions" aria-labelledby="factions-heading" gap="md">
              <SectionHeading id="factions-heading" icon={<Layers3 size={20} aria-hidden />}>
                Included factions
              </SectionHeading>
              {page.factions && page.factions.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {page.factions.map((f) => (
                    <Card key={f.factionId} withBorder padding="lg" radius="md">
                      <Stack gap="sm" h="100%">
                        <Title order={3} size="h4">
                          {f.name}
                        </Title>
                        <Badge variant="light" color="gray" w="fit-content">
                          Proposed faction summary
                        </Badge>
                        <Text size="sm" c="dimmed" flex={1}>
                          One sentence describing its identity and role in this ruleset.
                        </Text>
                        <Button
                          variant="light"
                          size="xs"
                          w="fit-content"
                          renderRoot={(rootProps) => (
                            <Link
                              {...rootProps}
                              to="/factions/$factionId"
                              params={{ factionId: f.urlSlug }}
                            />
                          )}
                        >
                          View faction
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Paper withBorder p="lg" radius="md">
                  <Text c="dimmed">No factions have been added to this ruleset yet.</Text>
                </Paper>
              )}
            </Stack>

            <Stack component="section" id="faq" aria-labelledby="faq-heading" gap="md">
              <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
                <Stack gap={4}>
                  <SectionHeading id="faq-heading" icon={<CircleHelp size={20} aria-hidden />}>
                    Frequently asked questions
                  </SectionHeading>
                  <Text size="sm" c="dimmed">
                    Search community questions or narrow the list by topic.
                  </Text>
                </Stack>
                <Badge variant="light" color="gray">
                  {page.faqItems.length} {page.faqItems.length === 1 ? 'question' : 'questions'}
                </Badge>
              </Group>
              <Paper withBorder p="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput
                    value={search.q ?? ''}
                    onChange={(event) => handleFaqSearchChange(event.currentTarget.value)}
                    placeholder="Search questions…"
                    aria-label="Search FAQ questions"
                    leftSection={<Search size={16} aria-hidden />}
                  />
                  <Select
                    value={search.tag ?? '__all__'}
                    onChange={handleFaqTagChange}
                    data={[
                      { value: '__all__', label: 'All tags' },
                      ...FAQ_TAG_VALUES.map((tag) => ({ value: tag, label: FAQ_TAG_LABELS[tag] })),
                    ]}
                    aria-label="Filter FAQ by tag"
                    allowDeselect={false}
                  />
                </SimpleGrid>
              </Paper>
              <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md">
                <FaqList
                  items={page.faqItems}
                  rulesetSlug={r.slug}
                  searchQuery={search.q ?? ''}
                  selectedTag={search.tag}
                />
              </Paper>
            </Stack>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 1, md: 2 }}>
          <Stack gap="md" component="aside" aria-label="Ruleset details">
            <Card withBorder padding="lg" radius="md">
              <Stack gap="md">
                <SectionHeading icon={<ListTree size={19} aria-hidden />} order={2}>
                  At a glance
                </SectionHeading>
                <SimpleGrid cols={2} spacing="sm">
                  <Fact
                    icon={<Layers3 size={17} aria-hidden />}
                    value={page.factions?.length ?? 0}
                    label="Factions"
                  />
                  <Fact
                    icon={<CircleHelp size={17} aria-hidden />}
                    value={page.faqItems.length}
                    label="Questions"
                  />
                  <Fact
                    icon={<CheckCircle2 size={17} aria-hidden />}
                    value={answeredFaqCount}
                    label="Answered"
                  />
                  <Fact
                    icon={<FileText size={17} aria-hidden />}
                    value="—"
                    label="Version · proposed"
                  />
                </SimpleGrid>
              </Stack>
            </Card>

            <Card withBorder padding="sm" radius="md">
              <Stack gap="xs">
                <SectionHeading icon={<ListTree size={19} aria-hidden />} order={2} px="sm" pt="xs">
                  On this page
                </SectionHeading>
                <nav aria-label="Ruleset sections">
                  <NavLink
                    label="About"
                    href="#overview"
                    leftSection={<BookOpen size={16} aria-hidden />}
                  />
                  <NavLink
                    label="Rules and variants"
                    href="#rules"
                    leftSection={<ScrollText size={16} aria-hidden />}
                  />
                  <NavLink
                    label="Factions"
                    href="#factions"
                    leftSection={<Layers3 size={16} aria-hidden />}
                  />
                  <NavLink
                    label="FAQ"
                    href="#faq"
                    leftSection={<CircleHelp size={16} aria-hidden />}
                  />
                </nav>
              </Stack>
            </Card>

            <Card withBorder padding="lg" radius="md">
              <Stack gap="md">
                <SectionHeading icon={<UsersRound size={19} aria-hidden />} order={2}>
                  Stewardship
                </SectionHeading>
                <Stack gap="sm">
                  <Box>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Owner
                    </Text>
                    {page.owner ? (
                      <ProfileLink
                        slug={page.owner.slug}
                        username={page.owner.username}
                        avatar_url={page.owner.avatar_url}
                      />
                    ) : (
                      <Text size="sm">Unknown</Text>
                    )}
                  </Box>
                  <Divider />
                  {r.group_id == null ? (
                    <Text size="sm" c="dimmed">
                      No maintaining group.
                    </Text>
                  ) : !assignedGroup ? (
                    <Text size="sm" c="dimmed">
                      Group unavailable.
                    </Text>
                  ) : (
                    <Stack gap="sm">
                      <Box>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                          Maintaining group
                        </Text>
                        {assignedGroup.slug ? (
                          <Anchor
                            fw={600}
                            renderRoot={(rootProps) => (
                              <Link
                                {...rootProps}
                                to="/groups/$groupSlug"
                                params={{ groupSlug: assignedGroup.slug }}
                              />
                            )}
                          >
                            {assignedGroup.name}
                          </Anchor>
                        ) : (
                          <Text fw={600}>{assignedGroup.name}</Text>
                        )}
                      </Box>
                      <Group justify="space-between" gap="xs">
                        <Text size="sm" c="dimmed">
                          Your membership
                        </Text>
                        <Badge
                          color={
                            membershipStatus === 'active'
                              ? 'green'
                              : membershipStatus === 'pending'
                                ? 'yellow'
                                : 'gray'
                          }
                          variant="light"
                        >
                          {membershipStatus === 'active'
                            ? 'Active'
                            : membershipStatus === 'pending'
                              ? 'Pending'
                              : 'Not a member'}
                        </Badge>
                      </Group>
                      {!profile.isPending && !profileUserId ? (
                        <Text size="sm">
                          <Anchor
                            renderRoot={(rootProps) => <Link {...rootProps} to="/auth/login" />}
                          >
                            Log in
                          </Anchor>{' '}
                          to join.
                        </Text>
                      ) : null}
                      {canRequestMembership ? (
                        <Button
                          type="button"
                          variant="light"
                          leftSection={<UserPlus size={16} aria-hidden />}
                          loading={requestMembership.isPending}
                          onClick={() => requestMembership.mutate(assignedGroup._id)}
                        >
                          Request membership
                        </Button>
                      ) : null}
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </Card>

            <Card withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <SectionHeading icon={<FileText size={19} aria-hidden />} order={2}>
                  Resources
                </SectionHeading>
                <Badge variant="light" color="gray" w="fit-content">
                  Proposed content
                </Badge>
                <Text size="sm" c="dimmed">
                  Printable rules, release notes, and a version history could live here.
                </Text>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </PageLayout>
  );
}

function SectionHeading({
  icon,
  children,
  order = 2,
  ...props
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  order?: 2 | 3;
} & React.ComponentProps<typeof Group>) {
  return (
    <Group gap="sm" wrap="nowrap" {...props}>
      <ThemeIcon variant="light" color="dune" size="md" radius="md">
        {icon}
      </ThemeIcon>
      <Title order={order} size={order === 2 ? 'h3' : 'h4'}>
        {children}
      </Title>
    </Group>
  );
}

function Fact({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color="gray" size="sm">
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={700} lh={1.2}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
