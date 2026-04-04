import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type GroupEntry, useUpdateGroup } from '@db/groups';
import formStyles from '@app/components/form/Form.module.css';
import { FormActions } from '@app/components/form/FormActions';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { TextField } from '@app/components/form/TextField';
import { Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import layoutStyles from '@app/components/profile/ProfilePageLayout.module.css';
import { groupInputSchema } from '@app/groups/validation';

const GROUP_SETTINGS_FORM_ID = 'group-settings';

export function GroupSettingsForm({ initial }: { initial: GroupEntry }) {
  const navigate = useNavigate();
  const updateGroup = useUpdateGroup();
  const [name, setName] = useState(initial.name);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setName(initial.name);
  }, [initial.name]);

  const mutationError =
    updateGroup.isError && updateGroup.error instanceof Error ? updateGroup.error.message : null;
  const fieldError = submitError ?? mutationError;
  const canSave = !updateGroup.isPending && name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const parsed = groupInputSchema.safeParse({ name: name.trim() });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      setSubmitError(msg || 'Invalid group name');
      return;
    }
    const prevSlug = initial.slug;
    updateGroup.mutate(
      { id: initial.id, input: parsed.data },
      {
        onSuccess: (entry) => {
          setSubmitError(null);
          if (prevSlug !== entry.slug) {
            navigate({
              to: '/groups/$groupSlug/edit',
              params: { groupSlug: entry.slug },
              replace: true,
            });
          }
        },
        onError: (err) => setSubmitError(err.message),
      }
    );
  };

  return (
    <div className={layoutStyles.root}>
      <Toolbar>
        <Toolbar.Left>
          <FormActions>
            <FormTooltip content={updateGroup.isPending ? 'Saving…' : 'Save group name'}>
              <UIButton
                type="submit"
                form={GROUP_SETTINGS_FORM_ID}
                iconOnly
                aria-label="Save group name"
                disabled={!canSave}
              >
                <Save size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
            <FormTooltip content="View group">
              <UIButton
                variant="secondary"
                to="/groups/$groupSlug"
                params={{ groupSlug: initial.slug }}
                aria-label="View group"
              >
                <Users size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
            <FormTooltip content="Back to profiles">
              <UIButton variant="nav" to="/profiles" aria-label="Back to profiles">
                <ArrowLeft size={16} aria-hidden />
              </UIButton>
            </FormTooltip>
          </FormActions>
        </Toolbar.Left>
      </Toolbar>

      <Card>
        <Stack as="form" gap={3} id={GROUP_SETTINGS_FORM_ID} onSubmit={handleSubmit}>
          <FormField label="Group name" htmlFor="group-settings-name" error={fieldError}>
            <TextField
              id="group-settings-name"
              name="name"
              required
              minLength={1}
              title="Group name may only contain letters and numbers"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (submitError) setSubmitError(null);
              }}
            />
          </FormField>
          <p className={formStyles.hint}>
            Renaming may change this group&apos;s URL slug. Bookmarks and shared links that use the
            old address may stop working until updated.
          </p>
        </Stack>
      </Card>
    </div>
  );
}
