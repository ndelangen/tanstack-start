import { z } from 'zod';

export const faqItemSchema = z.object({
  question: z.string().min(1),
});

export const faqAnswerSchema = z.object({
  answer: z.string().min(1),
});
