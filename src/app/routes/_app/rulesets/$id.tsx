import { createFileRoute, Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';

import { BlockCover } from '@app/components/block';
import { Card } from '@app/components/card/Card';
import { FormActions, FormButton } from '@app/components/form';
import { FaqList } from '@app/components/faq/FaqList';
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

import styles from './RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$id')({
  validateSearch: (params: Record<string, unknown>): { q?: string } => {
    const q = params?.q;
    return typeof q === 'string' ? { q } : {};
  },
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
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const matches = useMatches();
  const rulesetId = Number.parseInt(id, 10);
  const hasFaqChildRoute = matches.some((m) => m.pathname.includes('/faq/'));
  const ruleset = useRuleset(rulesetId);
  const profile = useCurrentProfile();
  const deleteRuleset = useDeleteRuleset();
  const factions = useRulesetFactionsWithDetails(ruleset.data?.id ?? 0);
  const faqItems = useFaqItemsByRuleset(ruleset.data?.id ?? 0);

  const showAskForm = !!profile?.data?.id;

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

  if (hasFaqChildRoute) {
    return <Outlet />;
  }

  const r = ruleset.data;

  const handleDelete = () => {
    if (!window.confirm(`Delete ruleset "${r.name}"? This cannot be undone.`)) return;
    deleteRuleset.mutate(rulesetId, {
      onSuccess: () => navigate({ to: '/rulesets' }),
    });
  };

  const handleFaqSearchChange = (value: string) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, q: value.trim() || undefined }),
      replace: true,
    });
  };

  const isOwner = profile?.data?.id === r.owner_id;

  return (
    <>
      <section className={styles.section}>
        <div className={styles.coverWrapper}>
          <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
        </div>
        <h2>{r.name}</h2>
        {isOwner && (
          <FormActions>
            <FormButton
              variant="danger"
              type="button"
              onClick={handleDelete}
              disabled={deleteRuleset.isPending}
            >
              {deleteRuleset.isPending ? 'Deleting…' : 'Delete ruleset'}
            </FormButton>
            {deleteRuleset.isError && (
              <span className={styles.error}>
                {deleteRuleset.error.message}
              </span>
            )}
          </FormActions>
        )}
      </section>

      {factions.data && factions.data.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Factions in this ruleset</h3>
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

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>FAQ</h3>
        <Card>
          {showAskForm && (
            <p style={{ marginBottom: '1rem' }}>
              <Link
                to="/rulesets/$id/faq/create"
                params={{ id }}
              >
                Ask a question
              </Link>
            </p>
          )}
          <FaqList
            items={faqItems.data ?? []}
            rulesetId={String(r.id)}
            searchQuery={search.q ?? ''}
            onSearchChange={handleFaqSearchChange}
          />
        </Card>
      </section>
    </>
  );
}
