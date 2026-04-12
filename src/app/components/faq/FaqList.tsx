import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { useMemo } from 'react';

import type { FaqItemWithDetails } from '@db/faq';
import { Stack } from '@app/components/generic/layout';
import { ProfileLink } from '@app/components/profile/ProfileLink';
import { FAQ_TAG_LABELS, type FaqTag } from '@app/faq/tags';
import { formatRelativeDate } from '@app/utils/formatRelativeDate';

import { FaqItemList, FaqItemListRow } from './FaqItemList';
import styles from './FaqList.module.css';

interface FaqListProps {
  items: FaqItemWithDetails[];
  rulesetSlug: string;
  searchQuery: string;
  selectedTag?: FaqTag;
}

export function FaqList({ items, rulesetSlug, searchQuery, selectedTag }: FaqListProps) {
  const filtered = useMemo(() => {
    const tagFiltered = selectedTag
      ? items.filter((item) => (item.tags ?? []).includes(selectedTag))
      : items;
    if (!searchQuery.trim()) return tagFiltered;
    return new Fuse(tagFiltered, { keys: ['question'], threshold: 0.4 })
      .search(searchQuery.trim())
      .map((r) => r.item);
  }, [items, searchQuery, selectedTag]);

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
              <FaqItemListRow key={item._id}>
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
                    {(item.tags ?? []).map((tag) => (
                      <span key={`${item._id}:${tag}`} className={styles.badge}>
                        {FAQ_TAG_LABELS[tag as FaqTag]}
                      </span>
                    ))}
                  </span>
                  {item.asker_profile && (
                    <>
                      <span>·</span>
                      <ProfileLink
                        slug={item.asker_profile.slug}
                        username={item.asker_profile.username}
                        avatar_url={item.asker_profile.avatar_url}
                        className={styles.askerLink}
                      />
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
