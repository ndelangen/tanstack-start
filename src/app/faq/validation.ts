import { z } from 'zod';

export const faqQuestionSchema = z.string().trim().min(1, 'Question is required');

export const faqAnswerSchema = z.string().trim().min(1, 'Answer is required');
