import { Anchor, Badge, Group, Stack, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { useMemo } from 'react';

import type { FaqItemWithDetails } from '@db/faq';
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
    return (
      <Text c="dimmed" ta="center" py="xl">
        No FAQ items yet.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="lg">
          No questions match your search.
        </Text>
      ) : (
        <FaqItemList>
          {filtered.map((item) => {
            const answerCount = item.faq_answers?.length ?? 0;
            const hasAcceptedAnswer = item.accepted_answer_id != null;

            return (
              <FaqItemListRow key={item._id}>
                <Anchor
                  fw={650}
                  className={styles.question}
                  renderRoot={(rootProps) => (
                    <Link
                      {...rootProps}
                      to="/rulesets/$rulesetSlug/faq/$questionSlug"
                      params={{ rulesetSlug, questionSlug: item.slug }}
                    />
                  )}
                >
                  {item.question}
                </Anchor>
                <Group gap="xs" wrap="wrap" className={styles.meta}>
                  <Group gap={6} wrap="wrap">
                    <Badge size="sm" variant="light" color={hasAcceptedAnswer ? 'green' : 'gray'}>
                      {hasAcceptedAnswer ? 'Answered' : 'Unanswered'}
                    </Badge>
                    <Badge size="sm" variant="light" color="gray">
                      {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                    </Badge>
                    {(item.tags ?? []).map((tag) => (
                      <Badge key={`${item._id}:${tag}`} size="sm" variant="outline" color="dune">
                        {FAQ_TAG_LABELS[tag as FaqTag]}
                      </Badge>
                    ))}
                  </Group>
                  {item.asker_profile && (
                    <>
                      <Text component="span" c="dimmed" aria-hidden>
                        ·
                      </Text>
                      <ProfileLink
                        slug={item.asker_profile.slug}
                        username={item.asker_profile.username}
                        avatar_url={item.asker_profile.avatar_url}
                        className={styles.askerLink}
                      />
                    </>
                  )}
                  <Text component="span" c="dimmed" aria-hidden>
                    ·
                  </Text>
                  <Text component="time" dateTime={item.created_at} size="xs" c="dimmed">
                    {formatRelativeDate(item.created_at)}
                  </Text>
                </Group>
              </FaqItemListRow>
            );
          })}
        </FaqItemList>
      )}
    </Stack>
  );
}
