import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import {
  faqItemsByRulesetQueryOptions,
  useFaqItemsByRuleset,
} from '@db/faq';
import { useCurrentProfile } from '@db/profiles';
import {
  rulesetDetailQueryOptions,
  rulesetFactionsWithDetailsQueryOptions,
  useDeleteRuleset,
  useRuleset,
  useRulesetFactionsWithDetails,
} from '@db/rulesets';

export const Route = createFileRoute('/_app/rulesets/$id')({
  loader: async ({ context, params }) => {
    const rulesetId = Number.parseInt(params.id, 10);
    try {
      const ruleset = await context.queryClient.ensureQueryData(
        rulesetDetailQueryOptions(rulesetId)
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
      return { notFound: false };
    } catch {
      return { notFound: true };
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
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const rulesetId = Number.parseInt(id, 10);
  const ruleset = useRuleset(rulesetId);
  const profile = useCurrentProfile();
  const deleteRuleset = useDeleteRuleset();
  const factions = useRulesetFactionsWithDetails(ruleset.data?.id ?? 0);
  const faqItems = useFaqItemsByRuleset(ruleset.data?.id ?? 0);

  if (loaderData?.notFound) {
    return (
      <div>
        <h2>Ruleset not found</h2>
        <p>This ruleset doesn&apos;t exist or was deleted.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  if (!ruleset.data) {
    return null;
  }

  const r = ruleset.data;

  const handleDelete = () => {
    if (!window.confirm(`Delete ruleset "${r.name}"? This cannot be undone.`)) return;
    deleteRuleset.mutate(rulesetId, {
      onSuccess: () => navigate({ to: '/rulesets' }),
    });
  };

  const isOwner = profile?.data?.id === r.owner_id;

  return (
    <>
      <h2>{r.name}</h2>
      {isOwner && (
        <p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteRuleset.isPending}
            style={{ color: 'var(--color-error, #c00)' }}
          >
            {deleteRuleset.isPending ? 'Deleting…' : 'Delete ruleset'}
          </button>
          {deleteRuleset.isError && (
            <span style={{ color: 'red', marginLeft: '0.5em' }}>
              {deleteRuleset.error.message}
            </span>
          )}
        </p>
      )}

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
                <Link
                  to="/rulesets/$id/faq/$faqId"
                  params={{ id: String(r.id), faqId: String(item.id) }}
                >
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
