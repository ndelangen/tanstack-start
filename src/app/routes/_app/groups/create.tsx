import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Save, X } from 'lucide-react';
import { useState } from 'react';

import { useCreateGroup } from '@db/groups';
import { useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/card/Card';
import { FormActions, FormButton, FormField, FormTooltip, TextField } from '@app/components/form';
import { Stack } from '@app/components/layout';

export const Route = createFileRoute('/_app/groups/create')({
  component: GroupCreatePage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Start group</h1>
      </div>
    ),
  },
});

function GroupCreatePage() {
  const navigate = useNavigate();
  const profile = useCurrentProfile();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!profile.data?.id || !profile.data.slug) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to start a group.
        </p>
        <p>
          <Link to="/profiles">Back to profiles</Link>
        </p>
      </Card>
    );
  }

  const canSubmit = !createGroup.isPending && name.trim().length > 0;

  return (
    <Card>
      <Stack
        as="form"
        gap={3}
        onSubmit={(e) => {
          e.preventDefault();
          const nextName = name.trim();
          if (!nextName) return;
          setSubmitError(null);
          createGroup.mutate(
            { input: { name: nextName } },
            {
              onSuccess: () => {
                setSubmitError(null);
                navigate({
                  to: '/profiles/$slug',
                  params: { slug: profile.data.slug },
                });
              },
              onError: (error) => setSubmitError(error.message),
            }
          );
        }}
      >
        <h2>Create a new group</h2>
        <div>
          <FormActions>
            <FormTooltip content="Save group">
              <FormButton type="submit" iconOnly aria-label="Save group" disabled={!canSubmit}>
                <Save size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
            <FormTooltip content="Close create group">
              <FormButton
                type="button"
                variant="secondary"
                iconOnly
                aria-label="Close create group"
                disabled={createGroup.isPending}
                onClick={() =>
                  navigate({ to: '/profiles/$slug', params: { slug: profile.data.slug } })
                }
              >
                <X size={16} aria-hidden />
              </FormButton>
            </FormTooltip>
          </FormActions>
        </div>
        <FormField
          label="Group name"
          htmlFor="group-name"
          error={submitError ?? createGroup.error?.message}
        >
          <TextField
            id="group-name"
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
      </Stack>
    </Card>
  );
}
