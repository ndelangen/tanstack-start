import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  BookOpen,
  Coins,
  Crown,
  Download,
  Eye,
  FileText,
  Handshake,
  HeartPulse,
  MapPin,
  Palette,
  Pencil,
  ScrollText,
  Shield,
  Swords,
  UserPlus,
  UsersRound,
} from 'lucide-react';

import { loadFaction, useFaction } from '@db/factions';
import { useRequestGroupMembership } from '@db/members';
import { useCurrentProfile } from '@db/profiles';
import { loadRulesetsByFaction, useRulesetsByFaction } from '@db/rulesets';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { ButtonGroup, Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { PageLayout } from '@app/components/shell';
import { factionAssetPublishingCopy } from '@app/factions/assetPublishingStatus';
import { LeaderToken } from '@game/assets/faction/leader/Leader';
import { Token as FactionToken } from '@game/assets/faction/token/Token';
import { TroopToken } from '@game/assets/faction/troop/Troop';

import styles from '../FactionDetailWireframe.module.css';

export const Route = createFileRoute('/_app/factions/$factionId/')({
  loader: async ({ params }) => {
    const faction = await loadFaction(params.factionId);
    const rulesets = await loadRulesetsByFaction(faction.faction._id);
    return { faction, rulesets };
  },
  component: FactionDetailPage,
});

function canEditFaction(
  profileId: string | undefined,
  ownerId: string | undefined,
  groupId: string | null | undefined,
  memberships: { group_id: string }[] | undefined
) {
  if (!profileId) return false;
  if (profileId === ownerId) return true;
  if (!groupId) return false;
  return (memberships ?? []).some((m) => m.group_id === groupId);
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
  const factionRow = faction;
  const profile = useCurrentProfile();
  const requestMembership = useRequestGroupMembership();

  if (!factionRow) {
    return (
      <PageLayout header={<h1>Faction</h1>}>
        <p>Loading faction…</p>
      </PageLayout>
    );
  }

  const canEdit = canEditFaction(profile.data?._id, owner?._id, factionRow.group_id, memberships);
  const factionGroupId = factionRow.group_id;

  const profileUserId = profile.data?.user_id;
  const assignedGroup = groupAccess?.group;
  const groupMembersList = groupAccess?.members ?? [];
  const viewerMembership = groupMembersList.find(
    (entry) => entry.membership.user_id === profileUserId
  )?.membership;
  const membershipStatus =
    viewerMembership && viewerMembership.status !== 'removed' ? viewerMembership.status : 'none';
  const canRequestMembership = !!profileUserId && !!assignedGroup && membershipStatus === 'none';

  const data = factionRow.data;
  const planets = data.planet ?? [];
  const troopCount = data.troops.reduce((total, troop) => total + troop.count, 0);
  const header = (
    <div className={styles.hero}>
      <div className={styles.factionSymbol} role="img" aria-label={`${data.name} symbol`}>
        <FactionToken logo={data.logo} background={data.background} />
      </div>
      <Stack gap={2} className={styles.heroCopy}>
        <p className={styles.eyebrow}>
          <Link to="/factions">Factions</Link> / Dense wireframe
        </p>
        <h1>{data.name}</h1>
        <p>
          <strong>Proposed summary:</strong> Add one sentence describing this faction's identity and
          play style.
        </p>
        <p className={styles.muted}>
          Maintained by {owner ? <ProfileLink {...owner} /> : <span>Loading owner...</span>}
        </p>
      </Stack>
    </div>
  );

  return (
    <PageLayout
      header={header}
      headerSize="compact"
      toolbar={
        <Toolbar>
          <Toolbar.Left>
            <ButtonGroup>
              <FormTooltip content="Back to factions">
                <UIButton variant="nav" to="/factions" aria-label="Back to factions">
                  <ArrowLeft size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
              {canEdit ? (
                <FormTooltip content="Edit faction">
                  <UIButton
                    variant="secondary"
                    to="/factions/$factionId/edit"
                    params={{ factionId }}
                    aria-label="Edit faction"
                  >
                    <Pencil size={16} aria-hidden />
                  </UIButton>
                </FormTooltip>
              ) : null}
            </ButtonGroup>
          </Toolbar.Left>
          <Toolbar.Right>
            <ButtonGroup>
              <FormTooltip content="Preview faction sheet">
                <UIButton
                  variant="confirm"
                  to="/preview/sheet/$factionSlug"
                  params={{ factionSlug: factionId }}
                  search={{ mode: 'db' }}
                  target="_blank"
                  aria-label="Preview faction sheet"
                >
                  <Eye size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
              {assetPublishing.publicationHref ? (
                <FormTooltip content="Open published PDF">
                  <UIButton
                    variant="secondary"
                    href={assetPublishing.publicationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open published PDF"
                  >
                    <Download size={16} aria-hidden />
                  </UIButton>
                </FormTooltip>
              ) : null}
            </ButtonGroup>
          </Toolbar.Right>
        </Toolbar>
      }
    >
      <div className={styles.contentColumns}>
        <Stack gap={3} className={styles.mainColumn}>
          <section className={styles.denseSection}>
            <h2 className={styles.iconHeading}>
              <UsersRound size={20} aria-hidden /> Leaders
            </h2>
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
          </section>

          <section className={styles.denseSection}>
            <h2 className={styles.iconHeading}>
              <Swords size={20} aria-hidden /> Troops
            </h2>
            <div className={styles.horizontalLane}>
              {data.troops.map((troop) => (
                <article className={styles.troopTile} key={`${troop.name}-${troop.image}`}>
                  <div className={styles.troopToken}>
                    <TroopToken
                      background={data.background}
                      image={troop.image}
                      star={troop.star}
                      striped={troop.striped}
                    />
                  </div>
                  <div className={styles.tileCopy}>
                    <strong>{troop.name}</strong>
                    <span>×{troop.count}</span>
                    <small>{troop.description}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {planets.length > 0 ? (
            <section className={styles.denseSection}>
              <h2 className={styles.iconHeading}>
                <MapPin size={20} aria-hidden /> Planets
              </h2>
              <div className={styles.horizontalLane}>
                {planets.map((planet) => (
                  <article className={styles.compactTile} key={`${planet.name}-${planet.image}`}>
                    <strong>{planet.name}</strong>
                    <small>{planet.description}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.denseSection}>
            <h2 className={styles.iconHeading}>
              <Shield size={20} aria-hidden /> Advantages
            </h2>
            {data.rules.advantages.length > 0 ? (
              <div className={styles.advantageList}>
                {data.rules.advantages.map((advantage, index) => (
                  <article
                    className={styles.advantage}
                    key={`${advantage.title ?? 'advantage'}-${advantage.text}`}
                  >
                    <h3>{advantage.title ?? `Advantage ${index + 1}`}</h3>
                    <p>{advantage.text}</p>
                    {advantage.karama ? (
                      <p className={styles.karama}>
                        <ScrollText size={16} aria-hidden /> {advantage.karama}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>No faction advantages have been added yet.</p>
            )}
          </section>

          <div className={styles.ruleGrid}>
            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <Handshake size={20} aria-hidden /> Alliance
                </h2>
              }
            >
              <p>{data.rules.alliance.text}</p>
            </Card>
            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <ScrollText size={20} aria-hidden /> {data.rules.fate.title ?? 'Fate'}
                </h2>
              }
            >
              <p>{data.rules.fate.text}</p>
            </Card>
          </div>
        </Stack>

        <aside className={styles.sidebar} aria-label="Faction details">
          <Stack gap={3}>
            <section className={styles.sidebarPanel}>
              <h2 className={styles.iconHeading}>
                <Crown size={20} aria-hidden /> Faction Leader
              </h2>
              <div className={styles.loreHeroToken}>
                <LeaderToken
                  {...data.hero}
                  strength={undefined}
                  background={data.background}
                  logo={data.logo}
                />
              </div>
            </section>

            <section className={styles.overviewBlock} aria-label="Faction overview">
              <div className={styles.metrics}>
                <span className={styles.metric} title="Starting spice">
                  <Coins size={20} aria-hidden />
                  <strong>{data.rules.spiceCount}</strong>
                  <small>Spice</small>
                </span>
                <span className={styles.metric} title="Leaders">
                  <UsersRound size={20} aria-hidden />
                  <strong>{data.leaders.length}</strong>
                  <small>Leaders</small>
                </span>
                <span className={styles.metric} title="Troops">
                  <Swords size={20} aria-hidden />
                  <strong>{troopCount}</strong>
                  <small>Troops</small>
                </span>
                <span className={styles.metric} title="Preferred colors">
                  <Palette size={20} aria-hidden />
                  <strong>{data.colors.join(' · ') || '—'}</strong>
                </span>
              </div>
              <div className={styles.overviewRules}>
                <article>
                  <h2 className={styles.iconHeading}>
                    <BookOpen size={18} aria-hidden /> Setup
                  </h2>
                  <p>{data.rules.startText}</p>
                </article>
                <article>
                  <h2 className={styles.iconHeading}>
                    <HeartPulse size={18} aria-hidden /> Revival
                  </h2>
                  <p>{data.rules.revivalText}</p>
                </article>
              </div>
            </section>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <UsersRound size={20} aria-hidden /> Stewardship
                </h2>
              }
            >
              {factionGroupId == null ? (
                <p className={styles.muted}>No maintaining group.</p>
              ) : !assignedGroup ? (
                <p className={styles.muted}>Group unavailable.</p>
              ) : (
                <Stack gap={2}>
                  <p>
                    {assignedGroup.slug ? (
                      <Link to="/groups/$groupSlug" params={{ groupSlug: assignedGroup.slug }}>
                        {assignedGroup.name}
                      </Link>
                    ) : (
                      <strong>{assignedGroup.name}</strong>
                    )}
                    {' · '}
                    {membershipStatus === 'active'
                      ? 'Member'
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
                        iconOnly
                        aria-label="Request membership"
                        disabled={requestMembership.isPending}
                        onClick={() => requestMembership.mutate(factionGroupId)}
                      >
                        <UserPlus size={16} aria-hidden />
                      </UIButton>
                    </FormTooltip>
                  ) : null}
                  {requestMembership.isError ? <p>{requestMembership.error?.message}</p> : null}
                </Stack>
              )}
            </Card>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <FileText size={20} aria-hidden /> Files
                </h2>
              }
            >
              <Stack gap={2}>
                <p>{factionAssetPublishingCopy(assetPublishing.status)}</p>
                <Link
                  to="/preview/sheet/$factionSlug"
                  params={{ factionSlug: factionId }}
                  search={{ mode: 'db' }}
                >
                  Preview faction sheet
                </Link>
              </Stack>
            </Card>

            <Card
              header={
                <h2 className={styles.iconHeading}>
                  <BookOpen size={20} aria-hidden /> Rulesets
                </h2>
              }
            >
              {rulesets.data && rulesets.data.length > 0 ? (
                <ul className={styles.compactList}>
                  {rulesets.data.map((ruleset) => (
                    <li key={ruleset.id}>
                      <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug: ruleset.slug }}>
                        {ruleset.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>Not in a ruleset yet.</p>
              )}
            </Card>
          </Stack>
        </aside>
      </div>
    </PageLayout>
  );
}
