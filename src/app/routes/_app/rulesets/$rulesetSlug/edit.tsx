import { createFileRoute, Link } from '@tanstack/react-router';

import { useCurrentProfile } from '@db/profiles';
import { loadRulesetDetailPage, useRulesetDetailPage } from '@db/rulesets';
import { RulesetSettingsForm } from '@app/components/rulesets/RulesetSettingsForm';
import { BlockCover } from '@app/components/generic/surfaces';
import { Card } from '@app/components/generic/surfaces/Card';

import styles from '../RulesetDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug/edit')({
  loader: async ({ params }) => {
    try {
      const detailPage = await loadRulesetDetailPage(params.rulesetSlug);
      return { notFound: false as const, detailPage };
    } catch {
      return { notFound: true as const };
    }
  },
  component: RulesetEditPage,
  staticData: {
    PageHead: RulesetEditPageHead,
  },
});

function RulesetEditPageHead() {
  const { rulesetSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const detailSeed = loaderData.notFound ? undefined : loaderData.detailPage;
  const page = useRulesetDetailPage(rulesetSlug, { initialData: detailSeed });

  if (loaderData.notFound || !page.ruleset) {
    return (
      <div>
        <h1>Edit ruleset</h1>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </div>
    );
  }

  const r = page.ruleset;
  return (
    <div className={styles.pageHead}>
      <div className={styles.rulesetHeadCover}>
        <BlockCover src={r.image_cover} alt={`Cover for ${r.name}`} />
      </div>
      <div className={styles.pageHeadText}>
        <h1 className={styles.rulesetTitle}>Edit {r.name}</h1>
        <p className={styles.pageHeadMeta}>
          <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug: r.slug }}>
            Back to ruleset
          </Link>
          {' · '}
          <Link to="/rulesets">All rulesets</Link>
        </p>
      </div>
    </div>
  );
}

function RulesetEditPage() {
  const { rulesetSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const detailSeed = loaderData.notFound ? undefined : loaderData.detailPage;
  const page = useRulesetDetailPage(rulesetSlug, { initialData: detailSeed });
  const profile = useCurrentProfile();

  if (loaderData.notFound) {
    return (
      <Card>
        <p>Ruleset not found.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </Card>
    );
  }

  if (!page.ruleset) {
    return null;
  }

  const r = page.ruleset;
  const viewerUserId = profile.data?.user_id;

  if (profile.isPending) {
    return null;
  }

  if (!viewerUserId) {
    return (
      <Card>
        <p>
          <Link to="/auth/login">Log in</Link> to edit this ruleset.
        </p>
        <p>
          <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug: r.slug }}>
            Back to ruleset
          </Link>
        </p>
      </Card>
    );
  }

  if (r.owner_id !== viewerUserId) {
    return (
      <Card>
        <p>Only the ruleset owner can edit settings.</p>
        <p>
          <Link to="/rulesets/$rulesetSlug" params={{ rulesetSlug: r.slug }}>
            Back to ruleset
          </Link>
        </p>
      </Card>
    );
  }

  return <RulesetSettingsForm key={r.slug} initial={r} />;
}
