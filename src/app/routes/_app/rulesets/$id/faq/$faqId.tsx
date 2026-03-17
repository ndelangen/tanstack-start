import { createFileRoute, Link } from '@tanstack/react-router';

import { faqItemDetailQueryOptions, useFaqItem } from '@db/faq';

export const Route = createFileRoute('/_app/rulesets/$id/faq/$faqId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      faqItemDetailQueryOptions(Number.parseInt(params.faqId, 10))
    ),
  component: FaqDetailPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>FAQ</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    ),
  },
});

function FaqDetailPage() {
  const { id, faqId } = Route.useParams();
  const faqItem = useFaqItem(Number.parseInt(faqId, 10));

  if (!faqItem.data) {
    return null;
  }

  const item = faqItem.data;
  const answers = Array.isArray(item.faq_answers) ? item.faq_answers : [];

  return (
    <>
      <p>
        <Link to="/rulesets/$id" params={{ id }}>Back to ruleset</Link>
      </p>
      <h2>{item.question}</h2>
      {answers.length > 0 ? (
        <ul>
          {answers.map((a) => (
            <li key={a.id}>
              {a.answer}
              {item.accepted_answer_id === a.id ? ' (accepted)' : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>No answers yet.</p>
      )}
    </>
  );
}
