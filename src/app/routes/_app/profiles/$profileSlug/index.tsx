import { useAuthActions } from '@convex-dev/auth/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, LogOut, Pencil, UserPlus } from 'lucide-react';

import { loadProfileBySlug, useCurrentProfile, useProfileBySlug } from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { ButtonGroup, Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import {
  ProfileFaqAnswersGiven,
  ProfileFaqQuestionsAsked,
} from '@app/components/profile/ProfileFaqActivity';
import { PageLayout } from '@app/components/shell';

import styles from '../ProfileDetail.module.css';

export const Route = createFileRoute('/_app/profiles/$profileSlug/')({
  loader: async ({ params }) => {
    const profilePage = await loadProfileBySlug(params.profileSlug);
    return { profilePage };
  },
  component: ProfileDetailPage,
});

function ProfileDetailPage() {
  const { profileSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const profileData = useProfileBySlug(profileSlug, { initialData: loaderData.profilePage });
  const currentProfile = useCurrentProfile();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const profileId = profileData.profile?._id;

  if (!profileId || !profileData.profile) {
    return (
      <PageLayout header={<h1>Profile</h1>}>
        <Card>
          <p>Profile not found.</p>
          <p>
            <Link to="/profiles">Back to profiles</Link>
          </p>
        </Card>
      </PageLayout>
    );
  }

  const isSelf = currentProfile.data?._id === profileData.profile._id;
  const initials =
    profileData.profile.username
      ?.slice(0, 2)
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || '?';

  const handleSignOut = async () => {
    await signOut();
    await navigate({ to: '/auth/login' });
  };

  const groupsById = new Map((profileData.groups ?? []).map((g) => [String(g._id), g] as const));

  const toolbar = (
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
  );

  return (
    <PageLayout
      header={
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
          <Stack gap={1}>
            <h1 className={styles.displayName}>{profileData.profile.username ?? 'Unknown'}</h1>
            {isSelf && <p className={styles.selfHint}>This is you!</p>}
          </Stack>
        </div>
      }
      toolbar={toolbar}
    >
      <Stack gap={2}>
        <Card header={<h3 className={styles.sectionTitle}>Groups</h3>}>
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

        <Card header={<h3 className={styles.sectionTitle}>Questions asked</h3>}>
          {profileData.faqAsked && profileData.faqAsked.length > 0 ? (
            <ProfileFaqQuestionsAsked items={profileData.faqAsked} />
          ) : (
            <p className={styles.empty}>No questions asked yet.</p>
          )}
        </Card>

        <Card header={<h3 className={styles.sectionTitle}>FAQ answers</h3>}>
          {profileData.faqAnswers && profileData.faqAnswers.length > 0 ? (
            <ProfileFaqAnswersGiven
              items={profileData.faqAnswers}
              viewedProfileId={profileData.profile._id}
            />
          ) : (
            <p className={styles.empty}>No FAQ answers yet.</p>
          )}
        </Card>

        <Card header={<h3 className={styles.sectionTitle}>Factions owned</h3>}>
          {profileData.factions && profileData.factions.length > 0 ? (
            <FactionList factions={profileData.factions} />
          ) : (
            <p className={styles.empty}>No factions owned.</p>
          )}
        </Card>
      </Stack>
    </PageLayout>
  );
}
