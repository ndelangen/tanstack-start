import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { faqItemsByRulesetQueryOptions, useCreateFaqItem } from '@db/faq';
import { useCurrentProfile } from '@db/profiles';
import { rulesetDetailQueryOptions, useRuleset } from '@db/rulesets';
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

export const Route = createFileRoute('/_app/rulesets/$id/faq/create')({
  loader: async ({ context, params }) => {
    const rulesetId = params.id;
    await context.queryClient.ensureQueryData(rulesetDetailQueryOptions(rulesetId));
    await context.queryClient.ensureQueryData(faqItemsByRulesetQueryOptions(rulesetId));
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
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const rulesetId = id;
  const ruleset = useRuleset(rulesetId);
  const profile = useCurrentProfile();
  const createFaqItem = useCreateFaqItem();

  if (!ruleset.data) {
    return null;
  }

  if (!profile?.data?.id) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to ask a question.
        </p>
        <p>
          <Link to="/rulesets/$id" params={{ id }}>
            Back to ruleset
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <>
      <Link to="/rulesets/$id" params={{ id }} style={{ display: 'block', marginBottom: '1rem' }}>
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
                    to: '/rulesets/$id/faq/$faqId',
                    params: { id, faqId: String(entry._id) },
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
              placeholder="Your question…"
            />
          </FormField>
          <FormField label="Your answer (optional—you can add or edit it later)">
            <MultilineTextField name="answer" rows={3} placeholder="Optional answer…" />
          </FormField>
          <FormActions>
            <FormButton type="submit" disabled={createFaqItem.isPending}>
              {createFaqItem.isPending ? 'Asking…' : 'Ask'}
            </FormButton>
            {createFaqItem.isError && (
              <span className={styles.error}>{createFaqItem.error.message}</span>
            )}
          </FormActions>
        </Stack>
      </Card>
    </>
  );
}
