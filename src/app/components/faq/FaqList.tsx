import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { useMemo } from 'react';

import type { FaqItemWithDetails } from '@db/faq';
import { Stack } from '@app/components/layout';
import { formatRelativeDate } from '@app/utils/formatRelativeDate';

import { FaqItemList, FaqItemListRow } from './FaqItemList';
import styles from './FaqList.module.css';

interface FaqListProps {
  items: FaqItemWithDetails[];
  rulesetSlug: string;
  searchQuery: string;
}

export function FaqList({ items, rulesetSlug, searchQuery }: FaqListProps) {
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['question'],
        threshold: 0.4,
      }),
    [items]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return fuse.search(searchQuery.trim()).map((r) => r.item);
  }, [items, searchQuery, fuse]);

  if (items.length === 0) {
    return <p className={styles.empty}>No FAQ items yet.</p>;
  }

  return (
    <Stack gap={3}>
      {filtered.length === 0 ? (
        <p className={styles.noResults}>No questions match your search.</p>
      ) : (
        <FaqItemList>
          {filtered.map((item) => {
            const answerCount = item.faq_answers?.length ?? 0;
            const hasAcceptedAnswer = item.accepted_answer_id != null;

            return (
              <FaqItemListRow key={item.id}>
                <Link
                  to="/rulesets/$rulesetSlug/faq/$questionSlug"
                  params={{ rulesetSlug, questionSlug: item.slug }}
                >
                  <span className={styles.question}>{item.question}</span>
                </Link>
                <div className={styles.meta}>
                  <span className={styles.badges}>
                    <span
                      className={hasAcceptedAnswer ? styles.badgeAnswered : styles.badgeUnanswered}
                    >
                      {hasAcceptedAnswer ? 'Answered' : 'Unanswered'}
                    </span>
                    <span className={styles.badge}>
                      {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                    </span>
                  </span>
                  {item.asker_profile && (
                    <>
                      <span>·</span>
                      <Link
                        to="/profiles/$slug"
                        params={{ slug: item.asker_profile.slug }}
                        className={styles.askerLink}
                      >
                        {item.asker_profile.avatar_url ? (
                          <img
                            src={item.asker_profile.avatar_url}
                            alt=""
                            className={styles.avatar}
                          />
                        ) : (
                          <span className={styles.avatarPlaceholder}>
                            {item.asker_profile.username
                              ?.slice(0, 2)
                              .toUpperCase()
                              .replace(/[^A-Z]/g, '') ?? '?'}
                          </span>
                        )}
                        <span>{item.asker_profile.username ?? 'Unknown'}</span>
                      </Link>
                    </>
                  )}
                  <span>·</span>
                  <time dateTime={item.created_at}>{formatRelativeDate(item.created_at)}</time>
                </div>
              </FaqItemListRow>
            );
          })}
        </FaqItemList>
      )}
    </Stack>
  );
}
