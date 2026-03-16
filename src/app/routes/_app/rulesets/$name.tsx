import { createFileRoute, Link } from '@tanstack/react-router';

import {
  faqItemsByRulesetQueryOptions,
  useFaqItemsByRuleset,
} from '@db/faq';
import {
  rulesetByNameQueryOptions,
  rulesetFactionsWithDetailsQueryOptions,
  useRulesetByName,
  useRulesetFactionsWithDetails,
} from '@db/rulesets';

export const Route = createFileRoute('/_app/rulesets/$name')({
  loader: async ({ context, params }) => {
    const ruleset = await context.queryClient.ensureQueryData(
      rulesetByNameQueryOptions(params.name)
    );
    if (ruleset) {
      await Promise.all([
        context.queryClient.ensureQueryData(
          faqItemsByRulesetQueryOptions(ruleset.id)
        ),
        context.queryClient.ensureQueryData(
          rulesetFactionsWithDetailsQueryOptions(ruleset.id)
        ),
      ]);
    }
  },
  component: RulesetDetailPage,
  staticData: {
    PageHead: () => (
      <div>
        <h1>Ruleset</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    ),
  },
});

function RulesetDetailPage() {
  const { name } = Route.useParams();
  const ruleset = useRulesetByName(name);
  const factions = useRulesetFactionsWithDetails(ruleset.data?.id ?? 0);
  const faqItems = useFaqItemsByRuleset(ruleset.data?.id ?? 0);

  if (!ruleset.data) {
    return null;
  }

  const r = ruleset.data;

  return (
    <>
      <h2>{r.name}</h2>

      {factions.data && factions.data.length > 0 && (
        <section>
          <h3>Factions in this ruleset</h3>
          <ul>
            {factions.data.map((f) => (
              <li key={f.factionId}>
                <Link to="/factions/$id" params={{ id: f.factionId }}>
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>FAQ</h3>
        {faqItems.data && faqItems.data.length > 0 ? (
          <ul>
            {faqItems.data.map((item) => (
              <li key={item.id}>
                <Link to="/rulesets/$name/faq/$id" params={{ name, id: String(item.id) }}>
                  {item.question}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No FAQ items yet.</p>
        )}
      </section>
    </>
  );
}
