import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { useCreateRuleset } from '@db/rulesets';
import { FormActions, FormButton, FormField, TextField } from '@app/components/generic/form';
import { Stack } from '@app/components/generic/layout';

export const Route = createFileRoute('/_app/rulesets/create')({
  component: CreateRulesetPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Create Ruleset</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    ),
  },
});

function CreateRulesetPage() {
  const navigate = useNavigate();
  const createRuleset = useCreateRuleset();
  const [name, setName] = useState('');

  return (
    <>
      <h2>Create a new ruleset</h2>
      <Stack
        as="form"
        gap={3}
        onSubmit={(e) => {
          e.preventDefault();
          const nextName = name.trim();
          if (!nextName) return;
          createRuleset.mutate(
            { input: { name: nextName } },
            {
              onSuccess: (entry) => {
                navigate({
                  to: '/rulesets/$rulesetSlug',
                  params: { rulesetSlug: entry.slug },
                });
              },
            }
          );
        }}
      >
        <FormField label="Name" htmlFor="ruleset-name" error={createRuleset.error?.message}>
          <TextField
            id="ruleset-name"
            name="name"
            required
            minLength={1}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormActions>
          <FormButton type="submit" disabled={createRuleset.isPending || name.trim().length === 0}>
            <Plus size={16} aria-hidden />
            <span>{createRuleset.isPending ? 'Creating…' : 'Create'}</span>
          </FormButton>
        </FormActions>
      </Stack>
    </>
  );
}
