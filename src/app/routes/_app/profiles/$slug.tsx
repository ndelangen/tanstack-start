import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil, UserPlus } from 'lucide-react';

import {
  loadProfileBySlug,
  type ProfilePageData,
  useCurrentProfile,
  useProfileBySlug,
} from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { IconButton } from '@app/components/generic/ui/IconButton';
import {
  ProfileFaqAnswersGiven,
  ProfileFaqQuestionsAsked,
} from '@app/components/profile/ProfileFaqActivity';
import layoutStyles from '@app/components/profile/ProfilePageLayout.module.css';

import styles from './ProfileDetail.module.css';

export const Route = createFileRoute('/_app/profiles/$slug')({
  loader: async ({ params }) => {
    const profilePage = await loadProfileBySlug(params.slug);
    return { profilePage };
  },
  component: ProfileDetailPage,
  staticData: {
    PageHead: ProfilePageHead,
  },
});

function ProfilePageHead() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData() as { profilePage?: ProfilePageData } | undefined;
  const profileData = useProfileBySlug(slug, { initialData: loaderData?.profilePage });
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
          <Stack gap={1}>
            <h2 className={styles.displayName}>{profileData.profile.username ?? 'Unknown'}</h2>
            {isSelf && <p className={styles.selfHint}>This is you!</p>}
          </Stack>
        </div>
      </div>
    </div>
  );
}

function ProfileDetailPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const profileData = useProfileBySlug(slug, { initialData: loaderData.profilePage });
  const currentProfile = useCurrentProfile();
  const profileId = profileData.profile?._id;

  if (!profileId || !profileData.profile) {
    return null;
  }

  const isSelf = currentProfile.data?._id === profileData.profile._id;

  const groupsById = new Map((profileData.groups ?? []).map((g) => [String(g._id), g] as const));

  return (
    <Stack className={layoutStyles.root} gap={2}>
      <Toolbar>
        <Toolbar.Left>
          <FormTooltip content="Back to profiles">
            <IconButton variant="nav" to="/profiles" aria-label="Back to profiles">
              <ArrowLeft size={16} aria-hidden />
            </IconButton>
          </FormTooltip>
          {isSelf ? (
            <FormTooltip content="Edit profile">
              <IconButton variant="secondary" to="/profiles/settings" aria-label="Edit profile">
                <Pencil size={16} aria-hidden />
              </IconButton>
            </FormTooltip>
          ) : null}
          {isSelf ? (
            <FormTooltip content="Start group">
              <IconButton variant="confirm" to="/groups/create" aria-label="Start group">
                <UserPlus size={16} aria-hidden />
              </IconButton>
            </FormTooltip>
          ) : null}
        </Toolbar.Left>
      </Toolbar>

      <Card
        header={
          <h3 className={styles.sectionTitle}>Groups</h3>
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
          <h3 className={styles.sectionTitle}>
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
          <h3 className={styles.sectionTitle}>FAQ answers</h3>
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
          <h3 className={styles.sectionTitle}>
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
