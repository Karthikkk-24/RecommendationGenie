import { Injectable } from '@nestjs/common';
import { ALGORITHM_VERSION, PIPELINE, SCORING_WEIGHTS } from '@recommendation-genie/config';
import type { ScoringWeights } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RecommendationConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefault(): Promise<void> {
    const existing = await this.prisma.client.recommendationConfig.findUnique({
      where: { algorithmVersion: ALGORITHM_VERSION },
    });
    if (existing) {
      if (!existing.active) {
        await this.prisma.client.recommendationConfig.updateMany({ data: { active: false } });
        await this.prisma.client.recommendationConfig.update({
          where: { id: existing.id },
          data: { active: true },
        });
      }
      return;
    }
    await this.prisma.client.recommendationConfig.updateMany({ data: { active: false } });
    await this.prisma.client.recommendationConfig.create({
      data: {
        algorithmVersion: ALGORITHM_VERSION,
        weights: SCORING_WEIGHTS,
        pipeline: PIPELINE,
        active: true,
      },
    });
  }

  async getActiveWeights(): Promise<ScoringWeights> {
    await this.ensureDefault();
    const active = await this.prisma.client.recommendationConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!active) {
      return { ...SCORING_WEIGHTS };
    }
    const weights = active.weights as Partial<ScoringWeights>;
    return {
      content: typeof weights.content === 'number' ? weights.content : SCORING_WEIGHTS.content,
      taste: typeof weights.taste === 'number' ? weights.taste : SCORING_WEIGHTS.taste,
      feedback: typeof weights.feedback === 'number' ? weights.feedback : SCORING_WEIGHTS.feedback,
      creator: typeof weights.creator === 'number' ? weights.creator : SCORING_WEIGHTS.creator,
      quality: typeof weights.quality === 'number' ? weights.quality : SCORING_WEIGHTS.quality,
      exploration:
        typeof weights.exploration === 'number' ? weights.exploration : SCORING_WEIGHTS.exploration,
    };
  }

  listVersions() {
    return this.prisma.client.recommendationConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
