import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Card } from '@app/components/card/Card';
import {
  FormActions,
  FormButton,
  FormField,
  FormInput,
  FormTextarea,
} from '@app/components/form';
import {
  faqItemsByRulesetQueryOptions,
  useCreateFaqItem,
} from '@db/faq';
import { rulesetDetailQueryOptions, useRuleset } from '@db/rulesets';
import { useCurrentProfile } from '@db/profiles';

import styles from '../../RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$id/faq/create')({
  loader: async ({ context, params }) => {
    const rulesetId = Number.parseInt(params.id, 10);
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
  const rulesetId = Number.parseInt(id, 10);
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const question = (
              form.elements.namedItem('question') as HTMLInputElement
            ).value.trim();
            const answer = (
              form.elements.namedItem('answer') as HTMLTextAreaElement
            ).value.trim();
            if (!question) return;
            createFaqItem.mutate(
              { rulesetId, question, answer: answer || undefined },
              {
                onSuccess: (entry) => {
                  form.reset();
                  navigate({
                    to: '/rulesets/$id/faq/$faqId',
                    params: { id, faqId: String(entry.id) },
                  });
                },
              }
            );
          }}
        >
          <FormField label="Ask a question">
            <FormInput
              type="text"
              name="question"
              required
              minLength={1}
              placeholder="Your question…"
            />
          </FormField>
          <FormField
            label="Your answer (optional—you can add or edit it later)"
          >
            <FormTextarea
              name="answer"
              rows={3}
              placeholder="Optional answer…"
            />
          </FormField>
          <FormActions>
            <FormButton type="submit" disabled={createFaqItem.isPending}>
              {createFaqItem.isPending ? 'Asking…' : 'Ask'}
            </FormButton>
            {createFaqItem.isError && (
              <span className={styles.error}>
                {createFaqItem.error.message}
              </span>
            )}
          </FormActions>
        </form>
      </Card>
    </>
  );
}
