import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import clsx from 'clsx';
import { ArrowLeft, Pencil, UserPlus } from 'lucide-react';

import { loadFactionsByOwner, useFactionsByOwner } from '@db/factions';
import {
  loadFaqAnswersByUser,
  loadFaqItemsAskedBy,
  useFaqAnswersByUser,
  useFaqItemsAskedBy,
} from '@db/faq';
import { loadUserGroupMemberships, useUserGroupMemberships } from '@db/members';
import { loadProfileBySlug, useCurrentProfile, useProfileBySlug } from '@db/profiles';
import { FactionList } from '@app/components/factions/FactionList';
import { FormActions } from '@app/components/form/FormActions';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { IconButton } from '@app/components/generic/ui';
import {
  ProfileFaqAnswersGiven,
  ProfileFaqQuestionsAsked,
} from '@app/components/profile/ProfileFaqActivity';
import layoutStyles from '@app/components/profile/ProfilePageLayout.module.css';

import styles from './ProfileDetail.module.css';

export const Route = createFileRoute('/_app/profiles/$slug')({
  loader: async ({ params }) => {
    const profile = await loadProfileBySlug(params.slug);
    const [memberships, factions, faqAsked, faqAnswers] = await Promise.all([
      loadUserGroupMemberships(profile.id),
      loadFactionsByOwner(profile.id),
      loadFaqItemsAskedBy(profile.id),
      loadFaqAnswersByUser(profile.id),
    ]);
    return { profile, memberships, factions, faqAsked, faqAnswers };
  },
  component: ProfileDetailPage,
  staticData: {
    PageHead: ProfilePageHead,
  },
});

const appRouteApi = getRouteApi('/_app');

function ProfilePageHead() {
  const { slug } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const profile = useProfileBySlug(slug, { initialData: loaderData.profile });
  const currentProfile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });

  if (!profile.data) {
    return null;
  }

  const initials =
    profile.data.username
      ?.slice(0, 2)
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || '?';
  const isSelf = currentProfile.data?.id === profile.data.id;

  return (
    <div>
      <div className={styles.identityRow}>
        {profile.data.avatar_url ? (
          <img
            src={profile.data.avatar_url}
            alt={profile.data.username ?? 'Avatar'}
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatarPlaceholder}>{initials}</span>
        )}
        <div>
          <h2 className={styles.displayName}>{profile.data.username ?? 'Unknown'}</h2>
          {isSelf && <p className={styles.selfHint}>This is you!</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileDetailPage() {
  const { slug } = Route.useParams();
  const appLoaderData = appRouteApi.useLoaderData();
  const loaderData = Route.useLoaderData();
  const profile = useProfileBySlug(slug, { initialData: loaderData.profile });
  const currentProfile = useCurrentProfile({
    initialCurrent: appLoaderData.currentProfile,
    initialCurrentUserId: appLoaderData.currentUserId,
  });
  const profileId = profile.data?.id;
  const memberships = useUserGroupMemberships(profileId, { initialData: loaderData.memberships });
  const factions = useFactionsByOwner(profileId, { initialData: loaderData.factions });
  const faqAsked = useFaqItemsAskedBy(profileId, { initialData: loaderData.faqAsked });
  const faqAnswers = useFaqAnswersByUser(profileId, { initialData: loaderData.faqAnswers });

  if (!profile.data) {
    return null;
  }

  const isSelf = currentProfile.data?.id === profile.data.id;

  return (
    <Stack className={layoutStyles.root} gap={2}>
      <div className={layoutStyles.toolbar}>
        <FormActions>
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
        </FormActions>
      </div>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>Groups</h3>
        }
      >
        {memberships.data && memberships.data.length > 0 ? (
          <ul className={styles.list}>
            {memberships.data.map((m) => (
              <li key={m.group_id}>
                <span>{m.groups?.name ?? 'Unknown group'}</span>
              </li>
            ))}
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
        {faqAsked.data && faqAsked.data.length > 0 ? (
          <ProfileFaqQuestionsAsked items={faqAsked.data} />
        ) : (
          <p className={styles.empty}>No questions asked yet.</p>
        )}
      </Card>

      <Card
        header={
          <h3 className={clsx(styles.sectionTitle, styles.sectionTitleCardHeader)}>FAQ answers</h3>
        }
      >
        {faqAnswers.data && faqAnswers.data.length > 0 ? (
          <ProfileFaqAnswersGiven items={faqAnswers.data} viewedProfileId={profile.data.id} />
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
        {factions.data && factions.data.length > 0 ? (
          <FactionList factions={factions.data} />
        ) : (
          <p className={styles.empty}>No factions owned.</p>
        )}
      </Card>
    </Stack>
  );
}
