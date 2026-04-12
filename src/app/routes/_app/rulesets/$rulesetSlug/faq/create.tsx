import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { useCreateFaqItem } from '@db/faq';
import { useCurrentProfile } from '@db/profiles';
import { loadRulesetBySlug, useRulesetBySlug } from '@db/rulesets';
import { FormField } from '@app/components/form/FormField';
import { MultilineTextField } from '@app/components/form/MultilineTextField';
import { TextField } from '@app/components/form/TextField';
import { ButtonGroup, Stack } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import type { FaqTag } from '@app/faq/tags';
import { FAQ_TAG_LABELS, FAQ_TAG_VALUES } from '@app/faq/tags';

import styles from '../../RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug/faq/create')({
  loader: async ({ params }) => ({ ruleset: await loadRulesetBySlug(params.rulesetSlug) }),
  component: FaqCreatePage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Ask a question</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    ),
  },
});

function FaqCreatePage() {
  const { rulesetSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const ruleset = useRulesetBySlug(rulesetSlug, { initialData: loaderData.ruleset });
  const profile = useCurrentProfile();
  const createFaqItem = useCreateFaqItem();

  if (!ruleset.data) {
    return null;
  }
  const rulesetId = ruleset.data.ruleset._id;

  if (!profile?.data?._id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to ask a question.
        </p>
        <p>
          <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug }}>
            Back to ruleset
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <>
      <Link
        to="/rulesets/$rulesetSlug"
        params={{ rulesetSlug }}
        style={{ display: 'block', marginBottom: '1rem' }}
      >
        Back to ruleset
      </Link>
      <Card>
        <Stack
          as="form"
          gap={3}
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.target as HTMLFormElement;
            const question = (
              formEl.elements.namedItem('question') as HTMLInputElement
            ).value.trim();
            const answer = (
              formEl.elements.namedItem('answer') as HTMLTextAreaElement
            ).value.trim();
            const selectedTags = Array.from(
              formEl.querySelectorAll<HTMLInputElement>('input[name="tags"]:checked')
            ).map((input) => input.value as FaqTag);
            if (!question) return;
            if (selectedTags.length === 0) return;
            createFaqItem.mutate(
              { rulesetId, question, answer: answer || undefined, tags: selectedTags },
              {
                onSuccess: (entry) => {
                  formEl.reset();
                  navigate({
                    to: '/rulesets/$rulesetSlug/faq/$questionSlug',
                    params: {
                      rulesetSlug,
                      questionSlug: entry.slug,
                    },
                  });
                },
              }
            );
          }}
        >
          <FormField label="Ask a question">
            <TextField
              type="text"
              name="question"
              required
              minLength={1}
              placeholder="Your question..."
            />
          </FormField>
          <FormField label="Your answer (optional-you can add or edit it later)">
            <MultilineTextField name="answer" rows={3} placeholder="Optional answer..." />
          </FormField>
          <FormField label="Tags">
            <Stack as="fieldset" gap={2} style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ display: 'none' }}>FAQ tags</legend>
              {FAQ_TAG_VALUES.map((tag) => (
                <label
                  key={tag}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <input type="checkbox" name="tags" value={tag} defaultChecked={tag === 'other'} />
                  <span>{FAQ_TAG_LABELS[tag]}</span>
                </label>
              ))}
            </Stack>
          </FormField>
          <ButtonGroup>
            <UIButton type="submit" disabled={createFaqItem.isPending}>
              {createFaqItem.isPending ? 'Asking…' : 'Ask'}
            </UIButton>
            {createFaqItem.isError && (
              <span className={styles.error}>{createFaqItem.error?.message}</span>
            )}
          </ButtonGroup>
        </Stack>
      </Card>
    </>
  );
}
