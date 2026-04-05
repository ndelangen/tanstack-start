import { useAuthActions } from '@convex-dev/auth/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import { ArrowLeft, LogOut, Pencil, UserPlus } from 'lucide-react';

import {
  loadProfileBySlug,
  type ProfilePageData,
  useCurrentProfile,
  useProfileBySlug,
} from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { ButtonGroup, Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import {
  ProfileFaqAnswersGiven,
  ProfileFaqQuestionsAsked,
} from '@app/components/profile/ProfileFaqActivity';
import layoutStyles from '@app/components/profile/ProfilePageLayout.module.css';

import styles from '../ProfileDetail.module.css';

export const Route = createFileRoute('/_app/profiles/$profileSlug/')({
  loader: async ({ params }) => {
    const profilePage = await loadProfileBySlug(params.profileSlug);
    return { profilePage };
  },
  component: ProfileDetailPage,
  staticData: {
    PageHead: ProfilePageHead,
  },
});

function ProfilePageHead() {
  const { profileSlug } = Route.useParams();
  const loaderData = Route.useLoaderData() as { profilePage?: ProfilePageData } | undefined;
  const profileData = useProfileBySlug(profileSlug, { initialData: loaderData?.profilePage });
  const currentProfile = useCurrentProfile();

  if (!profileData.profile) {
    return null;
  }

  const initials =
    profileData.profile.username
      ?.slice(0, 2)
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || '?';
  const isSelf = currentProfile.data?._id === profileData.profile._id;

  return (
    <div>
      <div className={styles.identityRow}>
        {profileData.profile.avatar_url ? (
          <img
            src={profileData.profile.avatar_url}
            alt={profileData.profile.username ?? 'Avatar'}
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatarPlaceholder}>{initials}</span>
        )}
        <div>
          <h2 className={styles.displayName}>{profileData.profile.username ?? 'Unknown'}</h2>
          {isSelf && <p className={styles.selfHint}>This is you!</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileDetailPage() {
  const { profileSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const profileData = useProfileBySlug(profileSlug, { initialData: loaderData.profilePage });
  const currentProfile = useCurrentProfile();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const profileId = profileData.profile?._id;

  if (!profileId || !profileData.profile) {
    return null;
  }

  const isSelf = currentProfile.data?._id === profileData.profile._id;

  const handleSignOut = async () => {
    await signOut();
    await navigate({ to: '/auth/login' });
  };

  const groupsById = new Map((profileData.groups ?? []).map((g) => [String(g._id), g] as const));

  return (
    <Stack className={layoutStyles.root} gap={2}>
      <Toolbar>
        <Toolbar.Left>
          <ButtonGroup>
            <FormTooltip content="Back to profiles">
              <UIButton variant="nav" to="/profiles" aria-label="Back to profiles">
                <ArrowLeft size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
            {isSelf ? (
              <FormTooltip content="Edit profile">
                <UIButton
                  variant="secondary"
                  to="/profiles/$profileSlug/edit"
                  params={{ profileSlug }}
                  aria-label="Edit profile"
                >
                  <Pencil size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            ) : null}
            {isSelf ? (
              <FormTooltip content="Start group">
                <UIButton variant="confirm" to="/groups/create" aria-label="Start group">
                  <UserPlus size={16} aria-hidden />
                </UIButton>
              </FormTooltip>
            ) : null}
          </ButtonGroup>
        </Toolbar.Left>
        {isSelf ? (
          <Toolbar.Right>
            <FormTooltip content="Log out">
              <UIButton
                type="button"
                variant="critical"
                iconOnly
                aria-label="Log out"
                onClick={() => void handleSignOut()}
              >
                <LogOut size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </Toolbar.Right>
        ) : null}
      </Toolbar>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>Groups</h3>
        }
      >
        {profileData.memberships && profileData.memberships.length > 0 ? (
          <ul className={styles.list}>
            {profileData.memberships.map((m) => {
              const group = groupsById.get(String(m.group_id));
              return (
                <li key={m._id}>
                  {group?.slug ? (
                    <Link to="/groups/$groupSlug" params={{ groupSlug: group.slug }}>
                      {group.name}
                    </Link>
                  ) : group ? (
                    <span>{group.name}</span>
                  ) : (
                    <span title={m.group_id}>Unknown group</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.empty}>Not a member of any groups.</p>
        )}
      </Card>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>
            Questions asked
          </h3>
        }
      >
        {profileData.faqAsked && profileData.faqAsked.length > 0 ? (
          <ProfileFaqQuestionsAsked items={profileData.faqAsked} />
        ) : (
          <p className={styles.empty}>No questions asked yet.</p>
        )}
      </Card>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>FAQ answers</h3>
        }
      >
        {profileData.faqAnswers && profileData.faqAnswers.length > 0 ? (
          <ProfileFaqAnswersGiven
            items={profileData.faqAnswers}
            viewedProfileId={profileData.profile._id}
          />
        ) : (
          <p className={styles.empty}>No FAQ answers yet.</p>
        )}
      </Card>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>
            Factions owned
          </h3>
        }
      >
        {profileData.factions && profileData.factions.length > 0 ? (
          <FactionList factions={profileData.factions} />
        ) : (
          <p className={styles.empty}>No factions owned.</p>
        )}
      </Card>
    </Stack>
  );
}
