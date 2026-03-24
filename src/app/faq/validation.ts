import { z } from 'zod';

export const faqQuestionSchema = z.string().trim().min(1, 'Question is required');

export const faqAnswerSchema = z.string().trim().min(1, 'Answer is required');

export const faqQuestionInputSchema = z.strictObject({
  question: faqQuestionSchema,
});

export const faqAnswerInputSchema = z.strictObject({
  answer: faqAnswerSchema,
});

export type FaqQuestionInput = z.infer<typeof faqQuestionInputSchema>;
export type FaqAnswerInput = z.infer<typeof faqAnswerInputSchema>;

/** Canonical FAQ semantic validation surface. */
export const faqValidationSchemas = {
  question: faqQuestionSchema,
  answer: faqAnswerSchema,
  questionInput: faqQuestionInputSchema,
  answerInput: faqAnswerInputSchema,
} as const;
