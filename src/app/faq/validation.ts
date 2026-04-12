import { z } from 'zod';
import { FAQ_TAG_VALUES } from './tags';

export const faqQuestionSchema = z.string().trim().min(1, 'Question is required');

export const faqAnswerSchema = z.string().trim().min(1, 'Answer is required');
export const faqTagSchema = z.enum(FAQ_TAG_VALUES);
export const faqTagsSchema = z.array(faqTagSchema).min(1, 'Select at least one tag');

export const faqQuestionInputSchema = z.strictObject({
  question: faqQuestionSchema,
  tags: faqTagsSchema,
});

export const faqAnswerInputSchema = z.strictObject({
  answer: faqAnswerSchema,
});

export type FaqQuestionInput = z.infer<typeof faqQuestionInputSchema>;
export type FaqAnswerInput = z.infer<typeof faqAnswerInputSchema>;
export type FaqTagsInput = z.infer<typeof faqTagsSchema>;

/** Canonical FAQ semantic validation surface. */
export const faqValidationSchemas = {
  question: faqQuestionSchema,
  answer: faqAnswerSchema,
  tag: faqTagSchema,
  tags: faqTagsSchema,
  questionInput: faqQuestionInputSchema,
  answerInput: faqAnswerInputSchema,
} as const;
