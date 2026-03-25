import { Link } from '@tanstack/react-router';
import clsx from 'clsx';

import type { FaqAnswerWithParent, FaqItemAskedByWithRuleset } from '@db/faq';
import { FaqItemList, FaqItemListRow } from '@app/components/faq/FaqItemList';
import { formatRelativeDate } from '@app/utils/formatRelativeDate';

import faqStyles from '../faq/FaqList.module.css';
import styles from './ProfileFaqActivity.module.css';

function truncate(text: string, max = 200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function AskerChip({
  profile,
  viewedProfileId,
}: {
  profile: NonNullable<FaqAnswerWithParent['asker_profile']>;
  viewedProfileId: string;
}) {
  if (profile.id === viewedProfileId) {
    return <span className={styles.selfNote}>Your question</span>;
  }

  return (
    <Link to="/profiles/$slug" params={{ slug: profile.slug }} className={faqStyles.askerLink}>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className={faqStyles.avatar} />
      ) : (
        <span className={faqStyles.avatarPlaceholder}>
          {profile.username
            ?.slice(0, 2)
            .toUpperCase()
            .replace(/[^A-Z]/g, '') ?? '?'}
        </span>
      )}
      <span>Question by {profile.username ?? 'Unknown'}</span>
    </Link>
  );
}

export function ProfileFaqQuestionsAsked({ items }: { items: FaqItemAskedByWithRuleset[] }) {
  if (items.length === 0) {
    return <p className={faqStyles.noResults}>No questions asked yet.</p>;
  }

  return (
    <FaqItemList>
      {items.map((item) => (
        <FaqItemListRow key={item.id}>
          <div className={styles.contextStrip}>
            <Link
              to="/rulesets/$id"
              params={{ id: String(item.ruleset.id) }}
              className={styles.rulesetLink}
            >
              {item.ruleset.name}
            </Link>
            <span aria-hidden>·</span>
            <time dateTime={item.created_at}>{formatRelativeDate(item.created_at)}</time>
          </div>
          <Link
            to="/rulesets/$rulesetSlug/faq/$questionSlug"
            params={{
              rulesetSlug: item.ruleset.slug,
              questionSlug: item.slug,
            }}
          >
            <span className={faqStyles.question}>{item.question}</span>
          </Link>
        </FaqItemListRow>
      ))}
    </FaqItemList>
  );
}

export function ProfileFaqAnswersGiven({
  items,
  viewedProfileId,
}: {
  items: FaqAnswerWithParent[];
  viewedProfileId: string;
}) {
  if (items.length === 0) {
    return <p className={faqStyles.noResults}>No FAQ answers yet.</p>;
  }

  return (
    <FaqItemList>
      {items.map((row) => {
        const isPicked = row.faq_item.accepted_answer_id === row.id;

        return (
          <FaqItemListRow key={row.id}>
            <div className={styles.contextStrip}>
              <Link
                to="/rulesets/$id"
                params={{ id: String(row.ruleset.id) }}
                className={styles.rulesetLink}
              >
                {row.ruleset.name}
              </Link>
              <span aria-hidden>·</span>
              {row.asker_profile ? (
                <AskerChip profile={row.asker_profile} viewedProfileId={viewedProfileId} />
              ) : (
                <span>Unknown asker</span>
              )}
              <span aria-hidden>·</span>
              <time dateTime={row.created_at}>{formatRelativeDate(row.created_at)}</time>
            </div>

            <p className={faqStyles.parentQuestion}>{row.faq_item.question}</p>

            <Link
              to="/rulesets/$rulesetSlug/faq/$questionSlug"
              params={{
                rulesetSlug: row.ruleset.slug,
                questionSlug: row.faq_item.slug,
              }}
            >
              <p className={faqStyles.answerPreview}>{truncate(row.answer)}</p>
            </Link>

            <div className={styles.answerFooter}>
              {isPicked ? (
                <span className={clsx(faqStyles.badge, faqStyles.badgeAnswered)}>
                  Picked answer
                </span>
              ) : null}
            </div>
          </FaqItemListRow>
        );
      })}
    </FaqItemList>
  );
}
