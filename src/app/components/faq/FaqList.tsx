import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useMemo } from 'react';

import type { FaqItemWithDetails } from '@db/faq';

import styles from './FaqList.module.css';

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

interface FaqListProps {
  items: FaqItemWithDetails[];
  rulesetId: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function FaqList({
  items,
  rulesetId,
  searchQuery,
  onSearchChange,
  placeholder = 'Search questions…',
}: FaqListProps) {
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
    <div>
      <div className={styles.searchField}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Search FAQ questions"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.noResults}>No questions match your search.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => {
            const answerCount = item.faq_answers?.length ?? 0;
            const hasAnswers = answerCount > 0;

            return (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemLink}>
                  <Link
                    to="/rulesets/$id/faq/$faqId"
                    params={{ id: rulesetId, faqId: String(item.id) }}
                  >
                    <span className={styles.question}>{item.question}</span>
                  </Link>
                  <div className={styles.meta}>
                    <span className={styles.badges}>
                      <span className={hasAnswers ? styles.badgeAnswered : styles.badgeUnanswered}>
                        {hasAnswers ? 'Answered' : 'Unanswered'}
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
                    <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
