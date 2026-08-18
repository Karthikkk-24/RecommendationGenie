import { z } from 'zod';
import { mediaTypeSchema, moodSchema, recommendationModeSchema } from './enums';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const scoringWeightsSchema = z.object({
  content: z.number(),
  taste: z.number(),
  feedback: z.number(),
  creator: z.number(),
  quality: z.number(),
  exploration: z.number(),
});
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

export const componentScoresSchema = z.object({
  content: z.number(),
  taste: z.number(),
  feedback: z.number(),
  creator: z.number(),
  quality: z.number(),
  novelty: z.number(),
  ai: z.number().nullable(),
});
export type ComponentScores = z.infer<typeof componentScoresSchema>;

export const mediaCardSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  posterUrl: z.string().nullable(),
  releaseDate: z.string().nullable(),
  genres: z.array(z.string()),
  tags: z.array(z.string()),
  creators: z.array(z.string()),
  popularity: z.number(),
  qualityScore: z.number(),
  runtimeMinutes: z.number().nullable(),
});
export type MediaCard = z.infer<typeof mediaCardSchema>;

export const generateRecommendationsInputSchema = z.object({
  mode: recommendationModeSchema.default('FOR_YOU'),
  mediaType: mediaTypeSchema.optional(),
  similarToId: z.string().optional(),
  mood: moodSchema.optional(),
  timeAvailableMinutes: z.number().int().positive().optional(),
  language: z.string().optional(),
  count: z.number().int().min(1).max(20).default(10),
});
export type GenerateRecommendationsInput = z.infer<typeof generateRecommendationsInputSchema>;

export const aiRerankItemSchema = z.object({
  mediaId: z.string(),
  rank: z.number().int().min(1),
  aiScore: z.number().min(0).max(1),
  reason: z.string(),
});

export const aiRerankResponseSchema = z.object({
  items: z.array(aiRerankItemSchema).min(1),
  notes: z.string().optional(),
});
export type AiRerankResponse = z.infer<typeof aiRerankResponseSchema>;

export const aiExplanationResponseSchema = z.object({
  explanation: z.string().min(20).max(800),
});
export type AiExplanationResponse = z.infer<typeof aiExplanationResponseSchema>;

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
  });
