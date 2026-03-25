import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { faqItemsByRulesetQueryOptions, useCreateFaqItem } from '@db/faq';
import { useCurrentProfile } from '@db/profiles';
import { rulesetBySlugQueryOptions, useRulesetBySlug } from '@db/rulesets';
import { Card } from '@app/components/card/Card';
import {
  FormActions,
  FormButton,
  FormField,
  MultilineTextField,
  TextField,
} from '@app/components/form';
import { Stack } from '@app/components/layout';

import styles from '../../RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug/faq/create')({
  loader: async ({ context, params }) => {
    const ruleset = await context.queryClient.ensureQueryData(
      rulesetBySlugQueryOptions(params.rulesetSlug)
    );
    await context.queryClient.ensureQueryData(faqItemsByRulesetQueryOptions(ruleset.id));
  },
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
  const navigate = useNavigate();
  const ruleset = useRulesetBySlug(rulesetSlug);
  const profile = useCurrentProfile();
  const createFaqItem = useCreateFaqItem();

  if (!ruleset.data) {
    return null;
  }
  const rulesetId = ruleset.data._id;

  if (!profile?.data?.id) {
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
            if (!question) return;
            createFaqItem.mutate(
              { rulesetId, question, answer: answer || undefined },
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
          <FormActions>
            <FormButton type="submit" disabled={createFaqItem.isPending}>
              {createFaqItem.isPending ? 'Asking…' : 'Ask'}
            </FormButton>
            {createFaqItem.isError && (
              <span className={styles.error}>{createFaqItem.error?.message}</span>
            )}
          </FormActions>
        </Stack>
      </Card>
    </>
  );
}
