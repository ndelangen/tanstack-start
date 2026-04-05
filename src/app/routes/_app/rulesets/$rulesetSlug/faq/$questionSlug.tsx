import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  type FaqItemByRulesetSlugInitialData,
  loadFaqItemByRulesetAndSlug,
  useCreateFaqAnswer,
  useDeleteFaqAnswer,
  useDeleteFaqItem,
  useFaqItemByRulesetAndSlug,
  useSetAcceptedAnswer,
  useUpdateFaqAnswer,
  useUpdateFaqItem,
} from '@db/faq';
import { useCurrentProfile } from '@db/profiles';
import { loadRulesetBySlug } from '@db/rulesets';
import { Answer } from '@app/components/faq/Answer';
import { FormField } from '@app/components/form/FormField';
import { FormTooltip } from '@app/components/form/FormTooltip';
import { MultilineTextField } from '@app/components/form/MultilineTextField';
import { Stack, Toolbar } from '@app/components/generic/layout';
import { Card } from '@app/components/generic/surfaces/Card';
import { UIButton } from '@app/components/generic/ui/UIButton';
import { ProfileLink } from '@app/components/profile/ProfileLink';

import styles from '../../$id/faq/FaqDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$rulesetSlug/faq/$questionSlug')({
  loader: async ({ params }) => {
    try {
      await loadRulesetBySlug(params.rulesetSlug);
      const item = await loadFaqItemByRulesetAndSlug(params.rulesetSlug, params.questionSlug);
      return { notFound: false, item };
    } catch {
      return { notFound: true };
    }
  },
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
  const { rulesetSlug, questionSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const faqItem = useFaqItemByRulesetAndSlug(rulesetSlug, questionSlug, {
    initialData:
      'item' in loaderData && loaderData.item
        ? ({
            ...loaderData.item,
            id: loaderData.item._id,
            faq_answers: loaderData.item.faq_answers.map((a) => ({
              ...a,
              id: a._id,
            })),
          } as FaqItemByRulesetSlugInitialData)
        : undefined,
  });
  const profile = useCurrentProfile();
  const updateFaqItem = useUpdateFaqItem();
  const deleteFaqItem = useDeleteFaqItem();
  const createFaqAnswer = useCreateFaqAnswer();
  const updateFaqAnswer = useUpdateFaqAnswer();
  const deleteFaqAnswer = useDeleteFaqAnswer();
  const setAcceptedAnswer = useSetAcceptedAnswer();

  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editQuestionValue, setEditQuestionValue] = useState('');
  const [editAnswerValue, setEditAnswerValue] = useState('');

  const item = faqItem.data;
  const answers = Array.isArray(item?.faq_answers) ? item.faq_answers : [];
  const orderedAnswers =
    item?.accepted_answer_id == null
      ? answers
      : [...answers].sort((a, b) =>
          a._id === item.accepted_answer_id ? -1 : b._id === item.accepted_answer_id ? 1 : 0
        );

  useEffect(() => {
    if (!item) return;
    const scrollToHash = () => {
      const targetSlug = window.location.hash.slice(1).trim();
      if (!targetSlug) return;
      const answer = answers.find((row) => row.answerer_profile?.slug === targetSlug);
      if (!answer) return;
      const node = document.getElementById(`faq-answer-${answer._id}`);
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, [item, answers]);

  if (loaderData?.notFound) {
    return (
      <Card>
        <h2>Question not found</h2>
        <p>This FAQ question does not exist in this ruleset.</p>
        <p>
          <Link to="/rulesets">Back to rulesets</Link>
        </p>
      </Card>
    );
  }

  if (!item) {
    return null;
  }

  const faqItemId = item._id;
  const isQuestionOwner = profile?.data?.user_id === item.asked_by;
  const hasUserAnswered = answers.some((a) => a.answered_by === profile?.data?.user_id);
  const showAddAnswerForm = !!profile?.data?.user_id && !hasUserAnswered;

  const canEditAnswer = (a: (typeof answers)[0]) => a.answered_by === profile?.data?.user_id;
  const canDeleteAnswer = (a: (typeof answers)[0]) =>
    a.answered_by === profile?.data?.user_id || isQuestionOwner;

  const handleDeleteQuestion = () => {
    if (!window.confirm('Delete this question and all its answers? This cannot be undone.')) return;
    deleteFaqItem.mutate(faqItemId, {
      onSuccess: () => navigate({ to: '/rulesets/$rulesetSlug', params: { rulesetSlug } }),
    });
  };

  const startEditQuestion = () => {
    setEditQuestionValue(item.question);
    setEditingQuestion(true);
  };

  const saveQuestion = () => {
    const trimmed = editQuestionValue.trim();
    if (!trimmed || trimmed === item.question) {
      setEditingQuestion(false);
      return;
    }
    updateFaqItem.mutate(
      { id: faqItemId, input: { question: trimmed } },
      {
        onSuccess: () => setEditingQuestion(false),
      }
    );
  };

  const startEditAnswer = (a: (typeof answers)[0]) => {
    setEditAnswerValue(a.answer);
    setEditingAnswerId(a._id);
  };

  const saveAnswer = (answerId: string) => {
    const trimmed = editAnswerValue.trim();
    const a = answers.find((x) => x._id === answerId);
    if (!a || !trimmed || trimmed === a.answer) {
      setEditingAnswerId(null);
      return;
    }
    updateFaqAnswer.mutate(
      { id: answerId, answer: trimmed },
      { onSuccess: () => setEditingAnswerId(null) }
    );
  };

  const handleDeleteAnswer = (answerId: string) => {
    if (!window.confirm('Delete this answer?')) return;
    deleteFaqAnswer.mutate(answerId);
  };

  return (
    <>
      <Link
        to="/rulesets/$rulesetSlug"
        params={{ rulesetSlug: item.ruleset.slug }}
        className={styles.backLink}
      >
        Back to ruleset
      </Link>

      <Card>
        <div className={styles.section}>
          {editingQuestion ? (
            <Stack gap={3}>
              <FormField label="Edit question">
                <MultilineTextField
                  value={editQuestionValue}
                  onChange={(e) => setEditQuestionValue(e.target.value)}
                  rows={2}
                />
              </FormField>
              <Toolbar>
                <Toolbar.Left>
                  <FormTooltip content="Save question">
                    <UIButton
                      type="button"
                      iconOnly
                      aria-label="Save question"
                      onClick={() => saveQuestion()}
                      disabled={updateFaqItem.isPending}
                    >
                      <Check size={16} aria-hidden />
                    </UIButton>
                  </FormTooltip>
                  <FormTooltip content="Cancel editing question">
                    <UIButton
                      variant="secondary"
                      type="button"
                      iconOnly
                      aria-label="Cancel editing question"
                      onClick={() => setEditingQuestion(false)}
                    >
                      <X size={16} aria-hidden />
                    </UIButton>
                  </FormTooltip>
                  {updateFaqItem.isError && (
                    <span className={styles.error}>{updateFaqItem.error?.message}</span>
                  )}
                </Toolbar.Left>
              </Toolbar>
            </Stack>
          ) : (
            <>
              <div className={styles.questionHeader}>
                {item.asker_profile && (
                  <ProfileLink
                    slug={item.asker_profile.slug}
                    username={item.asker_profile.username}
                    avatar_url={item.asker_profile.avatar_url}
                    className={styles.questionAskerLink}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <div>
                  <h2 className={styles.questionTitle}>{item.question}</h2>
                </div>
              </div>
              {isQuestionOwner && (
                <Toolbar>
                  <Toolbar.Left>
                    <FormTooltip content="Edit question">
                      <UIButton
                        type="button"
                        iconOnly
                        aria-label="Edit question"
                        onClick={startEditQuestion}
                      >
                        <Pencil size={16} aria-hidden />
                      </UIButton>
                    </FormTooltip>
                    <FormTooltip content="Delete question">
                      <UIButton
                        variant="critical"
                        type="button"
                        iconOnly
                        aria-label="Delete question"
                        onClick={handleDeleteQuestion}
                        disabled={deleteFaqItem.isPending}
                      >
                        <Trash2 size={16} aria-hidden />
                      </UIButton>
                    </FormTooltip>
                    {deleteFaqItem.isError && (
                      <span className={styles.error}>{deleteFaqItem.error?.message}</span>
                    )}
                  </Toolbar.Left>
                </Toolbar>
              )}
            </>
          )}
        </div>

        {showAddAnswerForm && (
          <Stack
            as="form"
            gap={3}
            className={styles.section}
            onSubmit={(e) => {
              e.preventDefault();
              const formEl = e.target as HTMLFormElement;
              const answer = (
                formEl.elements.namedItem('answer') as HTMLTextAreaElement
              ).value.trim();
              if (!answer) return;
              createFaqAnswer.mutate({ faqItemId, answer }, { onSuccess: () => formEl.reset() });
            }}
          >
            <FormField
              hint="Add your answer (1 per person-you can edit it later)"
              error={createFaqAnswer.isError ? createFaqAnswer.error?.message : undefined}
            >
              <MultilineTextField
                name="answer"
                rows={3}
                required
                minLength={1}
                placeholder="Your answer..."
              />
            </FormField>
            <Toolbar>
              <Toolbar.Left>
                <FormTooltip content="Add answer">
                  <UIButton
                    type="submit"
                    iconOnly
                    aria-label="Add answer"
                    disabled={createFaqAnswer.isPending}
                  >
                    <MessageSquarePlus size={16} aria-hidden />
                  </UIButton>
                </FormTooltip>
              </Toolbar.Left>
            </Toolbar>
          </Stack>
        )}

        {hasUserAnswered && !showAddAnswerForm && (
          <p className={styles.hintBlock}>You&apos;ve answered. You can edit your answer below.</p>
        )}

        {orderedAnswers.length > 0 ? (
          <Answer.List className={styles.answerList}>
            {orderedAnswers.map((a) => {
              const isEditing = editingAnswerId === a._id;
              const isUserAnswer = a.answered_by === profile?.data?.user_id;
              const isAccepted = item.accepted_answer_id === a._id;
              return (
                <Answer.Item
                  key={a._id}
                  id={`faq-answer-${a._id}`}
                  className={styles.answerItem}
                  isAccepted={isAccepted}
                >
                  {isEditing ? (
                    <Stack gap={3}>
                      <FormField label="Edit your answer">
                        <MultilineTextField
                          value={editAnswerValue}
                          onChange={(e) => setEditAnswerValue(e.target.value)}
                          rows={3}
                        />
                      </FormField>
                      <Toolbar>
                        <Toolbar.Left>
                          <FormTooltip content="Save answer">
                            <UIButton
                              type="button"
                              iconOnly
                              aria-label="Save answer"
                              onClick={() => saveAnswer(a._id)}
                              disabled={updateFaqAnswer.isPending}
                            >
                              <Check size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                          <FormTooltip content="Cancel editing answer">
                            <UIButton
                              variant="secondary"
                              type="button"
                              iconOnly
                              aria-label="Cancel editing answer"
                              onClick={() => setEditingAnswerId(null)}
                            >
                              <X size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                          {updateFaqAnswer.isError && (
                            <span className={styles.error}>{updateFaqAnswer.error?.message}</span>
                          )}
                        </Toolbar.Left>
                      </Toolbar>
                    </Stack>
                  ) : (
                    <>
                      {isAccepted && <span className={styles.answerMeta}>Accepted answer</span>}
                      {isUserAnswer && (
                        <span className={styles.answerMeta}>
                          Your answer-you can edit or delete it
                        </span>
                      )}
                      {a.answerer_profile && (
                        <span className={styles.answerMeta}>
                          <ProfileLink
                            slug={a.answerer_profile.slug}
                            username={a.answerer_profile.username}
                            avatar_url={a.answerer_profile.avatar_url}
                          />
                        </span>
                      )}
                      <div className={styles.answerContent}>{a.answer}</div>
                      <div className={styles.answerActions}>
                        {isQuestionOwner && !isAccepted && (
                          <FormTooltip content="Mark as accepted answer">
                            <UIButton
                              type="button"
                              iconOnly
                              aria-label="Mark as accepted answer"
                              onClick={() =>
                                setAcceptedAnswer.mutate({
                                  faqItemId,
                                  acceptedAnswerId: a._id,
                                })
                              }
                              disabled={setAcceptedAnswer.isPending}
                            >
                              <Check size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                        )}
                        {isQuestionOwner && isAccepted && (
                          <FormTooltip content="Unmark accepted answer">
                            <UIButton
                              type="button"
                              variant="secondary"
                              iconOnly
                              aria-label="Unmark accepted answer"
                              onClick={() =>
                                setAcceptedAnswer.mutate({
                                  faqItemId,
                                  acceptedAnswerId: null,
                                })
                              }
                              disabled={setAcceptedAnswer.isPending}
                            >
                              <X size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                        )}
                        {canEditAnswer(a) && (
                          <FormTooltip content="Edit your answer">
                            <UIButton
                              type="button"
                              iconOnly
                              aria-label="Edit your answer"
                              onClick={() => startEditAnswer(a)}
                            >
                              <Pencil size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                        )}
                        {canDeleteAnswer(a) && (
                          <FormTooltip content="Delete answer">
                            <UIButton
                              variant="critical"
                              type="button"
                              iconOnly
                              aria-label="Delete answer"
                              onClick={() => handleDeleteAnswer(a._id)}
                              disabled={deleteFaqAnswer.isPending}
                            >
                              <Trash2 size={16} aria-hidden />
                            </UIButton>
                          </FormTooltip>
                        )}
                      </div>
                    </>
                  )}
                </Answer.Item>
              );
            })}
          </Answer.List>
        ) : (
          <p>No answers yet.</p>
        )}
      </Card>
    </>
  );
}
