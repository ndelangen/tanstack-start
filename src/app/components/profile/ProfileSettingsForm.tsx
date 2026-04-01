import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useState } from 'react';

import { type ProfileEntry, useCurrentProfile, useUpdateCurrentProfile } from '@db/profiles';
import formStyles from '@app/components/form/Form.module.css';
import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { TextField } from '@app/components/form/TextField';
import { Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { IconButton } from '@app/components/generic/ui/IconButton';
import { profileSlugBaseFromName } from '@app/profile/validation';

import layoutStyles from './ProfilePageLayout.module.css';

/** HTML `id` / `form` attribute for toolbar submit control. */
const PROFILE_SETTINGS_FORM_ID = 'profile-settings';

function ProfileSettingsFormFields({ initial }: { initial: ProfileEntry }) {
  const navigate = useNavigate();
  const update = useUpdateCurrentProfile();

  const [username, setUsername] = useState(initial.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? '');

  const basePreview = profileSlugBaseFromName(username);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prevSlug = initial.slug;
    update.mutate(
      { input: { username, avatar_url: avatarUrl } },
      {
        onSuccess: (entry) => {
          if (prevSlug !== entry.slug) {
            navigate({ to: '/profiles/$slug', params: { slug: entry.slug }, replace: true });
          }
        },
      }
    );
  };

  const mutationError =
    update.isError && update.error instanceof Error ? update.error.message : null;

  return (
    <div className={layoutStyles.root}>
      <Toolbar>
        <Toolbar.Left>
          <FormActions>
            <FormTooltip content={update.isPending ? 'Saving…' : 'Save'}>
              <FormButton
                type="submit"
                form={PROFILE_SETTINGS_FORM_ID}
                iconOnly
                aria-label="Save profile"
                disabled={update.isPending}
              >
                <Save size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
            <FormTooltip content="View public profile">
              <IconButton
                variant="secondary"
                to="/profiles/$slug"
                params={{ slug: initial.slug }}
                aria-label="View public profile"
              >
                <User size={16} aria-hidden />
              </IconButton>
            </FormTooltip>
            <FormTooltip content="Back to profiles">
              <IconButton variant="nav" to="/profiles" aria-label="Back to profiles">
                <ArrowLeft size={16} aria-hidden />
              </IconButton>
            </FormTooltip>
          </FormActions>
        </Toolbar.Left>
      </Toolbar>

      <Card>
        <Stack as="form" gap={3} id={PROFILE_SETTINGS_FORM_ID} onSubmit={handleSubmit}>
          <FormField label="Display name" htmlFor="profile-display-name">
            <TextField
              id="profile-display-name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="nickname"
              maxLength={30}
            />
          </FormField>
          <p className={formStyles.hint}>
            Letters and numbers only, 5–30 characters, not all capitals. Your public profile URL
            uses an id derived from this name (e.g. <code>…/profiles/{basePreview}</code>, with a
            number suffix if needed). If you rename, that id and the URL can change, so older links
            may break—including bookmarks and pasted links.
          </p>

          <FormField label="Avatar image URL" htmlFor="profile-avatar-url">
            <TextField
              id="profile-avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
            />
          </FormField>
          <p className={formStyles.hint}>
            Must be a full <code>https://</code> URL. Avatar URL is required.
          </p>

          {mutationError && (
            <p className={formStyles.error} role="alert">
              {mutationError}
            </p>
          )}
        </Stack>
      </Card>
    </div>
  );
}

export function ProfileSettingsForm() {
  const profile = useCurrentProfile();

  if (!profile.data) {
    return null;
  }

  return <ProfileSettingsFormFields key={profile.data.slug} initial={profile.data} />;
}
