import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  ColorSwatch,
  Divider,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { createFileRoute, type ErrorComponentProps, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  BookOpen,
  Coins,
  Download,
  Eye,
  FileText,
  MapPin,
  Pencil,
  ScrollText,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { loadFaction, useFaction } from '@db/factions';
import { useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import { loadRulesetsByFaction, useRulesetsByFaction } from '@db/rulesets';
import { IconStat } from '@app/components/content/IconStat';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { PageLayout } from '@app/components/shell';
import { TopicIcon } from '@app/components/topics/TopicIcon';
import { factionAssetPublishingCopy } from '@app/factions/assetPublishingStatus';
import { LeaderToken } from '@game/assets/faction/leader/Leader';
import { Token as FactionToken } from '@game/assets/faction/token/Token';
import { TroopToken } from '@game/assets/faction/troop/Troop';

import styles from '../FactionDetail.module.css';

// https://api.tabletopsimulator.com/player/colors/
const ttsColorSwatches = {
  White: 'rgb(100% 100% 100%)',
  Brown: 'rgb(44.3% 23.1% 9%)',
  Red: 'rgb(85.6% 10% 9.4%)',
  Orange: 'rgb(95.6% 39.2% 11.3%)',
  Yellow: 'rgb(90.5% 89.8% 17.2%)',
  Green: 'rgb(19.2% 70.1% 16.8%)',
  Teal: 'rgb(12.9% 69.4% 60.7%)',
  Blue: 'rgb(11.8% 53% 100%)',
  Purple: 'rgb(62.7% 12.5% 94.1%)',
  Pink: 'rgb(96% 43.9% 80.7%)',
} as const;

export const Route = createFileRoute('/_app/factions/$factionId/')({
  codeSplitGroupings: [['component', 'pendingComponent', 'errorComponent']],
  loader: async ({ params }) => {
    const faction = await loadFaction(params.factionId);
    const rulesets = await loadRulesetsByFaction(faction.faction._id);
    return { faction, rulesets };
  },
  pendingComponent: FactionDetailPending,
  errorComponent: FactionDetailError,
  component: FactionDetailPage,
});

function FactionDetailPending() {
  return (
    <PageLayout
      header={
        <Stack align="center" gap="xs">
          <Title order={1}>Faction</Title>
          <Anchor renderRoot={(rootProps) => <Link {...rootProps} to="/factions" />}>
            Back to factions
          </Anchor>
        </Stack>
      }
    >
      <Paper withBorder p="xl" radius="md" aria-live="polite">
        <Stack gap="xs">
          <Title order={2}>Loading faction</Title>
          <Text c="dimmed">The faction details are still loading.</Text>
        </Stack>
      </Paper>
    </PageLayout>
  );
}

function FactionDetailError({ error }: ErrorComponentProps) {
  return (
    <PageLayout
      header={
        <Stack align="center" gap="xs">
          <Title order={1}>Faction</Title>
          <Anchor renderRoot={(rootProps) => <Link {...rootProps} to="/factions" />}>
            Back to factions
          </Anchor>
        </Stack>
      }
    >
      <Alert color="red" title="Faction could not be loaded" role="alert">
        <Text size="sm">{error.message || 'An unexpected error occurred.'}</Text>
      </Alert>
    </PageLayout>
  );
}

function canEditFaction(
  profileId: string | undefined,
  ownerId: string | undefined,
  groupId: string | null | undefined,
  memberships: { group_id: string }[] | undefined
) {
  if (!profileId) return false;
  if (profileId === ownerId) return true;
  if (!groupId) return false;
  return (memberships ?? []).some((membership) => membership.group_id === groupId);
}

function FactionDetailPage() {
  const { factionId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const factionSeed = loaderData.faction;

  const { faction, memberships, groupAccess, owner, assetPublishing } = useFaction(factionId, {
    initialData: factionSeed,
  });
  const rulesets = useRulesetsByFaction(factionSeed.faction._id, {
    initialData: loaderData.rulesets,
  });
  const profile = useCurrentProfile();
  const requestMembership = useRequestGroupMembership();

  if (!faction) {
    return (
      <PageLayout
        header={
          <Stack align="center" gap="xs">
            <Title order={1}>Faction</Title>
            <Anchor renderRoot={(rootProps) => <Link {...rootProps} to="/factions" />}>
              Back to factions
            </Anchor>
          </Stack>
        }
      >
        <Paper withBorder p="xl" radius="md">
          <Stack gap="xs">
            <Title order={2}>Loading faction</Title>
            <Text c="dimmed">The faction details are still loading.</Text>
          </Stack>
        </Paper>
      </PageLayout>
    );
  }

  const canEdit = canEditFaction(profile.data?._id, owner?._id, faction.group_id, memberships);
  const profileUserId = profile.data?.user_id;
  const assignedGroup = groupAccess?.group;
  const groupMembersList = groupAccess?.members ?? [];
  const viewerMembership = groupMembersList.find(
    (entry) => entry.membership.user_id === profileUserId
  )?.membership;
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = !!profileUserId && !!assignedGroup && membershipStatus === 'none';

  const data = faction.data;
  const planets = data.planet ?? [];
  const troopCount = data.troops.reduce((total, troop) => total + troop.count, 0);

  return (
    <PageLayout
      headerSize="compact"
      header={
        <Group wrap="nowrap" align="center" gap="lg" className={styles.pageHead}>
          <div className={styles.factionSymbol} role="img" aria-label={`${data.name} symbol`}>
            <FactionToken logo={data.logo} background={data.background} />
          </div>
          <Stack gap={6} className={styles.pageHeadText}>
            <Group gap="xs" wrap="wrap">
              <Anchor
                size="sm"
                fw={600}
                renderRoot={(rootProps) => <Link {...rootProps} to="/factions" />}
              >
                Factions
              </Anchor>
            </Group>
            <Title order={1} className={styles.factionTitle}>
              {data.name}
            </Title>
            <Group gap="xs" wrap="wrap">
              <Text size="sm" c="dimmed">
                Maintained by
              </Text>
              {owner ? <ProfileLink {...owner} /> : <Text size="sm">Unknown</Text>}
            </Group>
          </Stack>
        </Group>
      }
      toolbar={
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" gap="sm" wrap="wrap">
            <Tooltip label="Back to factions">
              <ActionIcon
                variant="light"
                color="gray"
                size="lg"
                aria-label="Back to factions"
                renderRoot={(rootProps) => <Link {...rootProps} to="/factions" />}
              >
                <ArrowLeft size={17} aria-hidden />
              </ActionIcon>
            </Tooltip>

            <Group gap="xs" wrap="wrap" role="group" aria-label="Faction actions">
              {canEdit ? (
                <Tooltip label="Edit faction">
                  <ActionIcon
                    variant="light"
                    color="dune"
                    size="lg"
                    aria-label="Edit faction"
                    renderRoot={(rootProps) => (
                      <Link {...rootProps} to="/factions/$factionId/edit" params={{ factionId }} />
                    )}
                  >
                    <Pencil size={17} aria-hidden />
                  </ActionIcon>
                </Tooltip>
              ) : null}
              <Tooltip label="Preview faction sheet">
                <ActionIcon
                  variant="filled"
                  color="confirm"
                  size="lg"
                  aria-label="Preview faction sheet"
                  renderRoot={(rootProps) => (
                    <Link
                      {...rootProps}
                      to="/preview/sheet/$factionSlug"
                      params={{ factionSlug: factionId }}
                      search={{ mode: 'db' }}
                      target="_blank"
                    />
                  )}
                >
                  <Eye size={17} aria-hidden />
                </ActionIcon>
              </Tooltip>
              {assetPublishing.publicationHref ? (
                <Tooltip label="Open published PDF">
                  <ActionIcon
                    component="a"
                    variant="light"
                    color="dune"
                    size="lg"
                    aria-label="Open published PDF"
                    href={assetPublishing.publicationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={17} aria-hidden />
                  </ActionIcon>
                </Tooltip>
              ) : null}
            </Group>
          </Group>
        </Paper>
      }
    >
      <Flex
        direction={{ base: 'column-reverse', md: 'row' }}
        gap="xl"
        align={{ base: 'stretch', md: 'flex-start' }}
      >
        <Box miw={0} style={{ flex: '1 1 auto' }}>
          <Stack gap="xl">
            <Stack component="section" aria-labelledby="leaders-heading" gap="md">
              <SectionHeading id="leaders-heading" icon={<TopicIcon topic="leaders" size={20} />}>
                Leaders
              </SectionHeading>
              <div className={styles.horizontalLane}>
                {data.leaders.map((leader) => (
                  <article
                    className={styles.leaderTile}
                    key={`${leader.name}-${leader.image}`}
                    title={`${leader.name}, strength ${leader.strength ?? 'not specified'}`}
                  >
                    <LeaderToken {...leader} background={data.background} logo={data.logo} />
                  </article>
                ))}
              </div>
            </Stack>

            <Stack component="section" aria-labelledby="troops-heading" gap="md">
              <SectionHeading id="troops-heading" icon={<TopicIcon topic="troops" size={20} />}>
                Troops
              </SectionHeading>
              <div className={styles.horizontalLane}>
                {data.troops.map((troop) => (
                  <Paper
                    component="article"
                    withBorder
                    p="sm"
                    radius="md"
                    className={styles.troopTile}
                    key={`${troop.name}-${troop.image}`}
                  >
                    <Group wrap="nowrap" gap="md">
                      <div className={styles.troopToken}>
                        <TroopToken
                          background={data.background}
                          image={troop.image}
                          star={troop.star}
                          striped={troop.striped}
                        />
                      </div>
                      <Stack gap={4} miw={0} style={{ flex: '1 1 auto' }}>
                        <Group gap="xs" wrap="nowrap" justify="space-between">
                          <Text fw={700} lh={1.2}>
                            {troop.name}
                          </Text>
                          <Badge variant="light" color="dune" size="lg">
                            ×{troop.count}
                          </Badge>
                        </Group>
                        {troop.description ? (
                          <Text size="xs" c="dimmed">
                            {troop.description}
                          </Text>
                        ) : null}
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </div>
            </Stack>

            {planets.length > 0 ? (
              <Stack component="section" aria-labelledby="planets-heading" gap="md">
                <SectionHeading id="planets-heading" icon={<MapPin size={20} aria-hidden />}>
                  Planets
                </SectionHeading>
                <div className={styles.horizontalLane}>
                  {planets.map((planet) => (
                    <Paper
                      component="article"
                      withBorder
                      p="md"
                      radius="md"
                      className={styles.planetTile}
                      key={`${planet.name}-${planet.image}`}
                    >
                      <Stack gap="xs">
                        <Text fw={700}>{planet.name}</Text>
                        <Text size="xs" c="dimmed">
                          {planet.description}
                        </Text>
                      </Stack>
                    </Paper>
                  ))}
                </div>
              </Stack>
            ) : null}

            <Stack component="section" aria-labelledby="advantages-heading" gap="md">
              <SectionHeading
                id="advantages-heading"
                icon={<TopicIcon topic="advantages" size={20} />}
              >
                Advantages
              </SectionHeading>
              {data.rules.advantages.length > 0 ? (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {data.rules.advantages.map((advantage, index) => (
                    <Card
                      key={`${advantage.title ?? 'advantage'}-${advantage.text}`}
                      withBorder
                      padding="lg"
                      radius="md"
                    >
                      <Stack gap="sm">
                        <Title order={3} size="h4">
                          {advantage.title ?? `Advantage ${index + 1}`}
                        </Title>
                        <Text size="sm">{advantage.text}</Text>
                        {advantage.karama ? (
                          <Group gap="xs" wrap="nowrap" align="flex-start">
                            <ScrollText size={16} aria-hidden />
                            <Text size="sm" c="dimmed">
                              {advantage.karama}
                            </Text>
                          </Group>
                        ) : null}
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Paper withBorder p="lg" radius="md">
                  <Text c="dimmed">No faction advantages have been added yet.</Text>
                </Paper>
              )}
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Card withBorder padding="lg" radius="md">
                <Stack gap="md">
                  <SectionHeading icon={<TopicIcon topic="alliance" size={20} />} order={3}>
                    Alliance
                  </SectionHeading>
                  <Text size="sm">{data.rules.alliance.text}</Text>
                </Stack>
              </Card>
              <Card withBorder padding="lg" radius="md">
                <Stack gap="md">
                  <SectionHeading icon={<ScrollText size={20} aria-hidden />} order={3}>
                    {data.rules.fate.title ?? 'Fate'}
                  </SectionHeading>
                  <Text size="sm">{data.rules.fate.text}</Text>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Box>

        <Stack
          gap="md"
          component="aside"
          aria-label="Faction details"
          w={{ base: '100%', md: '15rem' }}
          miw={0}
          style={{ flex: '0 0 auto' }}
        >
          <Stack component="section" aria-labelledby="faction-leader-heading" gap="md">
            <SectionHeading id="faction-leader-heading" icon={<TopicIcon topic="hero" size={20} />}>
              Faction leader
            </SectionHeading>
            <div className={styles.loreHeroToken}>
              <LeaderToken
                {...data.hero}
                strength={undefined}
                background={data.background}
                logo={data.logo}
              />
            </div>
          </Stack>

          <Stack component="section" aria-labelledby="setup-heading" gap="md">
            <SectionHeading id="setup-heading" icon={<BookOpen size={20} aria-hidden />}>
              Setup
            </SectionHeading>
            <Card withBorder padding="lg" radius="md">
              <Stack gap="lg">
                <Box>
                  <Title order={3} size="h4">
                    Components
                  </Title>
                  <Group gap="lg" mt="sm" wrap="wrap">
                    <IconStat
                      icon={<Coins size={17} aria-hidden />}
                      value={data.rules.spiceCount}
                      label={`${data.rules.spiceCount} spice`}
                    />
                    <IconStat
                      icon={<TopicIcon topic="leaders" size={17} />}
                      value={data.leaders.length}
                      label={`${data.leaders.length} ${data.leaders.length === 1 ? 'leader' : 'leaders'}`}
                    />
                    <IconStat
                      icon={<TopicIcon topic="troops" size={17} />}
                      value={troopCount}
                      label={`${troopCount} ${troopCount === 1 ? 'troop' : 'troops'}`}
                    />
                  </Group>
                  <Stack gap="xs" mt="lg">
                    <Title order={4} size="h5">
                      Preferred TTS color
                    </Title>
                    {data.colors.length > 0 ? (
                      <Group gap="sm">
                        {data.colors.map((color) => (
                          <Tooltip key={color} label={`${color} TTS color`}>
                            <ColorSwatch
                              color={ttsColorSwatches[color]}
                              size={18}
                              aria-label={`${color} TTS color`}
                            />
                          </Tooltip>
                        ))}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        None specified.
                      </Text>
                    )}
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Title order={3} size="h4">
                    At start
                  </Title>
                  <Text size="sm" mt="xs">
                    {data.rules.startText}
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Title order={3} size="h4">
                    Revival
                  </Title>
                  <Text size="sm" mt="xs">
                    {data.rules.revivalText}
                  </Text>
                </Box>
              </Stack>
            </Card>
          </Stack>

          <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
              <SectionHeading icon={<UsersRound size={20} aria-hidden />}>
                Stewardship
              </SectionHeading>
              {faction.group_id == null ? (
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
                      <Anchor renderRoot={(rootProps) => <Link {...rootProps} to="/auth/login" />}>
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
              {requestMembership.isError ? (
                <Alert color="red" title="Membership request failed" role="alert">
                  {requestMembership.error?.message}
                </Alert>
              ) : null}
            </Stack>
          </Card>

          <Card withBorder padding="lg" radius="md">
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" gap="sm">
                <SectionHeading icon={<FileText size={20} aria-hidden />}>Files</SectionHeading>
                <Badge
                  variant="light"
                  color={
                    assetPublishing.status === 'current'
                      ? 'green'
                      : assetPublishing.status === 'delayed'
                        ? 'yellow'
                        : 'gray'
                  }
                >
                  {assetPublishing.status ?? 'Unavailable'}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {factionAssetPublishingCopy(assetPublishing.status)}
              </Text>
              <Anchor
                fw={600}
                renderRoot={(rootProps) => (
                  <Link
                    {...rootProps}
                    to="/preview/sheet/$factionSlug"
                    params={{ factionSlug: factionId }}
                    search={{ mode: 'db' }}
                  />
                )}
              >
                Preview faction sheet
              </Anchor>
            </Stack>
          </Card>

          <Card withBorder padding="lg" radius="md">
            <Stack gap="sm">
              <SectionHeading icon={<BookOpen size={20} aria-hidden />}>Rulesets</SectionHeading>
              {rulesets.data === undefined ? (
                <Text size="sm" c="dimmed">
                  Loading rulesets…
                </Text>
              ) : rulesets.data.length > 0 ? (
                <Stack component="ul" gap="xs" m={0} pl="lg">
                  {rulesets.data.map((ruleset) => (
                    <li key={ruleset.id}>
                      <Anchor
                        renderRoot={(rootProps) => (
                          <Link
                            {...rootProps}
                            to="/rulesets/$rulesetSlug"
                            params={{ rulesetSlug: ruleset.slug }}
                          />
                        )}
                      >
                        {ruleset.name}
                      </Anchor>
                    </li>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  Not in a ruleset yet.
                </Text>
              )}
            </Stack>
          </Card>
        </Stack>
      </Flex>
    </PageLayout>
  );
}

function SectionHeading({
  icon,
  children,
  order = 2,
  ...props
}: {
  icon: ReactNode;
  children: ReactNode;
  order?: 2 | 3;
} & ComponentProps<typeof Group>) {
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
