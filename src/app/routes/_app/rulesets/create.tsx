import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { useCreateRuleset } from '@db/rulesets';

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

  return (
    <>
      <h2>Create a new ruleset</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
          if (!name) return;
          createRuleset.mutate(
            { input: { name } },
            {
              onSuccess: (entry) => {
                navigate({ to: '/rulesets/$id', params: { id: String(entry.id) } });
              },
            }
          );
        }}
      >
        <label>
          Name <input type="text" name="name" required minLength={1} />
        </label>
        <button type="submit" disabled={createRuleset.isPending}>
          {createRuleset.isPending ? 'Creating…' : 'Create'}
        </button>
        {createRuleset.isError && (
          <p style={{ color: 'red' }}>{createRuleset.error.message}</p>
        )}
      </form>
    </>
  );
}
