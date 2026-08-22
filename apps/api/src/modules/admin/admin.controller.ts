import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { RecommendationConfigService } from '../recommendation/recommendation-config.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationConfig: RecommendationConfigService,
    private readonly ai: AiService,
  ) {}

  @Get('health')
  async health() {
    const [users, generations, failedAi] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.recommendationGeneration.count(),
      this.prisma.client.aiRequest.count({ where: { success: false } }),
    ]);
    return { users, generations, failedAi, mockMode: this.ai.mockMode() };
  }

  @Get('ai-failures')
  aiFailures() {
    return this.prisma.client.aiRequest.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('algorithm-versions')
  async versions() {
    await this.recommendationConfig.ensureDefault();
    return this.recommendationConfig.listVersions();
  }

  @Patch('algorithm-versions/:id/activate')
  activateVersion(@Param('id') id: string) {
    return this.recommendationConfig.activateVersion(id);
  }
}
