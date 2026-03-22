import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import {
  faqItemDetailQueryOptions,
  useCreateFaqAnswer,
  useDeleteFaqAnswer,
  useDeleteFaqItem,
  useFaqItem,
  useUpdateFaqAnswer,
  useUpdateFaqItem,
} from '@db/faq';
import { profileDetailQueryOptions, useCurrentProfile } from '@db/profiles';
import { Card } from '@app/components/card/Card';
import {
  FormActions,
  FormButton,
  FormField,
  FormTextarea,
  FormTooltip,
} from '@app/components/form';
import { Stack } from '@app/components/layout';

import styles from './FaqDetail.module.css';

export const Route = createFileRoute('/_app/rulesets/$id/faq/$faqId')({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(
      faqItemDetailQueryOptions(Number.parseInt(params.faqId, 10))
    );
    if (item) {
      await context.queryClient.ensureQueryData(profileDetailQueryOptions(item.asked_by));
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
  const { id, faqId } = Route.useParams();
  const navigate = useNavigate();
  const faqItemId = Number.parseInt(faqId, 10);
  const faqItem = useFaqItem(faqItemId);
  const profile = useCurrentProfile();
  const askerId = faqItem.data?.asked_by;
  const askerProfile = useQuery({
    ...profileDetailQueryOptions(askerId ?? ''),
    enabled: !!askerId,
  });
  const updateFaqItem = useUpdateFaqItem();
  const deleteFaqItem = useDeleteFaqItem();
  const createFaqAnswer = useCreateFaqAnswer();
  const updateFaqAnswer = useUpdateFaqAnswer();
  const deleteFaqAnswer = useDeleteFaqAnswer();

  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editQuestionValue, setEditQuestionValue] = useState('');
  const [editAnswerValue, setEditAnswerValue] = useState('');

  if (!faqItem.data) {
    return null;
  }

  const item = faqItem.data;
  const answers = Array.isArray(item.faq_answers) ? item.faq_answers : [];
  const isQuestionOwner = profile?.data?.id === item.asked_by;
  const hasUserAnswered = answers.some((a) => a.answered_by === profile?.data?.id);
  const showAddAnswerForm = !!profile?.data?.id && !hasUserAnswered;

  const canEditAnswer = (a: (typeof answers)[0]) => a.answered_by === profile?.data?.id;
  const canDeleteAnswer = (a: (typeof answers)[0]) =>
    a.answered_by === profile?.data?.id || isQuestionOwner;

  const handleDeleteQuestion = () => {
    if (!window.confirm('Delete this question and all its answers? This cannot be undone.')) return;
    deleteFaqItem.mutate(faqItemId, {
      onSuccess: () => navigate({ to: '/rulesets/$id', params: { id } }),
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
    setEditingAnswerId(a.id);
  };

  const saveAnswer = (answerId: number) => {
    const trimmed = editAnswerValue.trim();
    const a = answers.find((x) => x.id === answerId);
    if (!a || !trimmed || trimmed === a.answer) {
      setEditingAnswerId(null);
      return;
    }
    updateFaqAnswer.mutate(
      { id: answerId, answer: trimmed },
      { onSuccess: () => setEditingAnswerId(null) }
    );
  };

  const handleDeleteAnswer = (answerId: number) => {
    if (!window.confirm('Delete this answer?')) return;
    deleteFaqAnswer.mutate(answerId);
  };

  return (
    <>
      <Link to="/rulesets/$id" params={{ id }} className={styles.backLink}>
        Back to ruleset
      </Link>

      <Card>
        <div className={styles.section}>
          {editingQuestion ? (
            <Stack gap={3}>
              <FormField label="Edit question">
                <FormTextarea
                  value={editQuestionValue}
                  onChange={(e) => setEditQuestionValue(e.target.value)}
                  rows={2}
                />
              </FormField>
              <FormActions>
                <FormTooltip content="Save question">
                  <FormButton
                    type="button"
                    iconOnly
                    aria-label="Save question"
                    onClick={() => saveQuestion()}
                    disabled={updateFaqItem.isPending}
                  >
                    <Check size={16} aria-hidden />
                  </FormButton>
                </FormTooltip>
                <FormTooltip content="Cancel editing question">
                  <FormButton
                    variant="secondary"
                    type="button"
                    iconOnly
                    aria-label="Cancel editing question"
                    onClick={() => setEditingQuestion(false)}
                  >
                    <X size={16} aria-hidden />
                  </FormButton>
                </FormTooltip>
                {updateFaqItem.isError && (
                  <span className={styles.error}>{updateFaqItem.error.message}</span>
                )}
              </FormActions>
            </Stack>
          ) : (
            <>
              <div className={styles.questionHeader}>
                {askerProfile.data && (
                  <Link
                    to="/profiles/$slug"
                    params={{ slug: askerProfile.data.slug }}
                    style={{ flexShrink: 0 }}
                  >
                    {askerProfile.data.avatar_url ? (
                      <img
                        src={askerProfile.data.avatar_url}
                        alt={askerProfile.data.username ?? 'Avatar'}
                        className={styles.avatar}
                      />
                    ) : (
                      <span className={styles.avatarPlaceholder}>
                        {askerProfile.data.username
                          ?.slice(0, 2)
                          .toUpperCase()
                          .replace(/[^A-Z]/g, '') ?? '?'}
                      </span>
                    )}
                  </Link>
                )}
                <div>
                  <h2 className={styles.questionTitle}>{item.question}</h2>
                  {askerProfile.data && (
                    <span className={styles.askedBy}>
                      Asked by{' '}
                      <Link to="/profiles/$slug" params={{ slug: askerProfile.data.slug }}>
                        {askerProfile.data.username ?? 'Unknown'}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
              {isQuestionOwner && (
                <FormActions>
                  <FormTooltip content="Edit question">
                    <FormButton
                      type="button"
                      iconOnly
                      aria-label="Edit question"
                      onClick={startEditQuestion}
                    >
                      <Pencil size={16} aria-hidden />
                    </FormButton>
                  </FormTooltip>
                  <FormTooltip content="Delete question">
                    <FormButton
                      variant="danger"
                      type="button"
                      iconOnly
                      aria-label="Delete question"
                      onClick={handleDeleteQuestion}
                      disabled={deleteFaqItem.isPending}
                    >
                      <Trash2 size={16} aria-hidden />
                    </FormButton>
                  </FormTooltip>
                  {deleteFaqItem.isError && (
                    <span className={styles.error}>{deleteFaqItem.error.message}</span>
                  )}
                </FormActions>
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
              hint="Add your answer (1 per person—you can edit it later)"
              error={createFaqAnswer.isError ? createFaqAnswer.error.message : undefined}
            >
              <FormTextarea
                name="answer"
                rows={3}
                required
                minLength={1}
                placeholder="Your answer…"
              />
            </FormField>
            <FormActions>
              <FormTooltip content="Add answer">
                <FormButton
                  type="submit"
                  iconOnly
                  aria-label="Add answer"
                  disabled={createFaqAnswer.isPending}
                >
                  <MessageSquarePlus size={16} aria-hidden />
                </FormButton>
              </FormTooltip>
            </FormActions>
          </Stack>
        )}

        {hasUserAnswered && !showAddAnswerForm && (
          <p className={styles.hintBlock}>You&apos;ve answered. You can edit your answer below.</p>
        )}

        {answers.length > 0 ? (
          <ul className={styles.answerList}>
            {answers.map((a) => {
              const isEditing = editingAnswerId === a.id;
              const isUserAnswer = a.answered_by === profile?.data?.id;
              return (
                <li key={a.id} className={styles.answerItem}>
                  {isEditing ? (
                    <Stack gap={3}>
                      <FormField label="Edit your answer">
                        <FormTextarea
                          value={editAnswerValue}
                          onChange={(e) => setEditAnswerValue(e.target.value)}
                          rows={3}
                        />
                      </FormField>
                      <FormActions>
                        <FormTooltip content="Save answer">
                          <FormButton
                            type="button"
                            iconOnly
                            aria-label="Save answer"
                            onClick={() => saveAnswer(a.id)}
                            disabled={updateFaqAnswer.isPending}
                          >
                            <Check size={16} aria-hidden />
                          </FormButton>
                        </FormTooltip>
                        <FormTooltip content="Cancel editing answer">
                          <FormButton
                            variant="secondary"
                            type="button"
                            iconOnly
                            aria-label="Cancel editing answer"
                            onClick={() => setEditingAnswerId(null)}
                          >
                            <X size={16} aria-hidden />
                          </FormButton>
                        </FormTooltip>
                        {updateFaqAnswer.isError && (
                          <span className={styles.error}>{updateFaqAnswer.error.message}</span>
                        )}
                      </FormActions>
                    </Stack>
                  ) : (
                    <>
                      {isUserAnswer && (
                        <span className={styles.answerMeta}>
                          Your answer—you can edit or delete it
                        </span>
                      )}
                      <div className={styles.answerContent}>
                        {a.answer}
                        {item.accepted_answer_id === a.id && ' (accepted)'}
                      </div>
                      <div className={styles.answerActions}>
                        {canEditAnswer(a) && (
                          <FormTooltip content="Edit your answer">
                            <FormButton
                              type="button"
                              iconOnly
                              aria-label="Edit your answer"
                              onClick={() => startEditAnswer(a)}
                            >
                              <Pencil size={16} aria-hidden />
                            </FormButton>
                          </FormTooltip>
                        )}
                        {canDeleteAnswer(a) && (
                          <FormTooltip content="Delete answer">
                            <FormButton
                              variant="danger"
                              type="button"
                              iconOnly
                              aria-label="Delete answer"
                              onClick={() => handleDeleteAnswer(a.id)}
                              disabled={deleteFaqAnswer.isPending}
                            >
                              <Trash2 size={16} aria-hidden />
                            </FormButton>
                          </FormTooltip>
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No answers yet.</p>
        )}
      </Card>
    </>
  );
}
