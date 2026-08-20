import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aiRerankResponseSchema, aiExplanationResponseSchema } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isMock(): boolean {
    return this.config.get('AI_MOCK') === 'true' || !this.config.get('OPENAI_API_KEY');
  }

  async rerank(input: {
    userId: string;
    tasteSummary: string;
    positives: string[];
    negatives: string[];
    candidates: Array<{ id: string; title: string; type: string; genres: string[]; score: number }>;
  }) {
    if (this.isMock()) {
      const started = Date.now();
      const items = input.candidates.map((item, index) => ({
        mediaId: item.id,
        rank: index + 1,
        aiScore: Math.max(0, 1 - index * 0.03),
        reason: 'Deterministic fallback ranking',
      }));
      await this.log({
        userId: input.userId,
        requestType: 'RERANK',
        success: true,
        latencyMs: Date.now() - started,
        payload: { items, mock: true },
      });
      return items;
    }

    const started = Date.now();
    try {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const result = await generateObject({
        model: openai(this.config.get('AI_RERANK_MODEL') ?? 'gpt-4o-mini'),
        schema: aiRerankResponseSchema,
        temperature: 0.2,
        prompt: `You rerank entertainment recommendations. Do not invent titles. Only use the candidate IDs provided.
Taste summary: ${input.tasteSummary}
Positive preferences: ${input.positives.join(', ')}
Negative preferences: ${input.negatives.join(', ')}
Candidates JSON: ${JSON.stringify(input.candidates)}
Return structured ranks preserving diversity across media types and tones.`,
      });
      await this.log({
        userId: input.userId,
        requestType: 'RERANK',
        success: true,
        latencyMs: Date.now() - started,
        payload: result.object,
      });
      return result.object.items;
    } catch (error) {
      this.logger.warn(error);
      await this.log({
        userId: input.userId,
        requestType: 'RERANK',
        success: false,
        latencyMs: Date.now() - started,
        errorMessage: error instanceof Error ? error.message : 'rerank failed',
      });
      return input.candidates.map((item, index) => ({
        mediaId: item.id,
        rank: index + 1,
        aiScore: item.score,
        reason: 'Fallback after AI error',
      }));
    }
  }

  async explain(input: {
    userId: string;
    title: string;
    genres: string[];
    likedTitles: string[];
    scores: Record<string, number>;
  }): Promise<string> {
    const grounded = `Genie thinks this could be a strong match because it lines up with ${input.likedTitles.slice(0, 3).join(', ') || 'your recent taste'} and leans into ${input.genres.slice(0, 3).join(', ') || 'your preferred themes'}. Content match ${Math.round(input.scores.content * 100)}%, taste match ${Math.round(input.scores.taste * 100)}%.`;
    if (this.isMock()) {
      const started = Date.now();
      await this.log({
        userId: input.userId,
        requestType: 'EXPLANATION',
        success: true,
        latencyMs: Date.now() - started,
        payload: { explanation: grounded, mock: true },
      });
      return grounded;
    }
    const started = Date.now();
    try {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const result = await generateObject({
        model: openai(this.config.get('AI_EXPLANATION_MODEL') ?? 'gpt-4o-mini'),
        schema: aiExplanationResponseSchema,
        temperature: 0.4,
        prompt: `Write an honest recommendation explanation. Never claim facts not in the data. Never say the user will definitely love it. Use "Genie thinks this could be a strong match because...".
Title: ${input.title}
Genres: ${input.genres.join(', ')}
Liked titles: ${input.likedTitles.join(', ')}
Scores: ${JSON.stringify(input.scores)}`,
      });
      await this.log({
        userId: input.userId,
        requestType: 'EXPLANATION',
        success: true,
        latencyMs: Date.now() - started,
        payload: result.object,
      });
      return result.object.explanation;
    } catch (error) {
      this.logger.warn(error);
      await this.log({
        userId: input.userId,
        requestType: 'EXPLANATION',
        success: false,
        latencyMs: Date.now() - started,
        errorMessage: error instanceof Error ? error.message : 'explain failed',
        payload: { explanation: grounded, fallback: true },
      });
      return grounded;
    }
  }

  private async log(input: {
    userId?: string;
    requestType: string;
    success: boolean;
    latencyMs: number;
    payload?: unknown;
    errorMessage?: string;
  }): Promise<void> {
    const request = await this.prisma.client.aiRequest.create({
      data: {
        userId: input.userId,
        requestType: input.requestType,
        provider: this.isMock() ? 'mock' : 'openai',
        model: this.config.get('AI_RERANK_MODEL') ?? 'gpt-4o-mini',
        latencyMs: input.latencyMs,
        success: input.success,
        errorMessage: input.errorMessage,
      },
    });
    if (input.payload) {
      await this.prisma.client.aiResponse.create({
        data: { requestId: request.id, payload: input.payload as object },
      });
    }
  }
}
