import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { useCreateRuleset } from '@db/rulesets';
import { useGroupsByCreator } from '@db/groups';
import { FormActions } from '@app/components/form/FormActions';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { FormField } from '@app/components/form/FormField';
import { TextField } from '@app/components/form/TextField';
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
  const [groupId, setGroupId] = useState<string | null>(null);
  const groups = useGroupsByCreator('');

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
            { input: { name: nextName }, groupId: groupId ?? null },
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
        <FormField label="Group" htmlFor="ruleset-group">
          <select
            id="ruleset-group"
            name="group"
            value={groupId ?? ''}
            onChange={(event) =>
              setGroupId(event.target.value === '' ? null : event.target.value)
            }
          >
            <option value="">No group</option>
            {groups.data?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormActions>
          <UIButton type="submit" disabled={createRuleset.isPending || name.trim().length === 0}>
            <Plus size={16} aria-hidden />
            <span>{createRuleset.isPending ? 'Creating…' : 'Create'}</span>
          </UIButton>
        </FormActions>
      </Stack>
    </>
  );
}
