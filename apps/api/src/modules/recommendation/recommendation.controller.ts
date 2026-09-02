import { Body, Controller, Get, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  supportedMediaTypeValues,
  moodValues,
  recommendationModeValues,
  type SupportedMediaType,
  type Mood,
  type RecommendationMode,
} from '@recommendation-genie/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RecommendationService } from './recommendation.service';

class GenerateDto {
  @IsOptional()
  @IsEnum(recommendationModeValues)
  mode?: RecommendationMode;

  @IsOptional()
  @IsEnum(supportedMediaTypeValues)
  mediaType?: SupportedMediaType;

  @IsOptional()
  @IsString()
  similarToId?: string;

  @IsOptional()
  @IsEnum(moodValues)
  mood?: Mood;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  timeAvailableMinutes?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;
}

@Controller('recommendations')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class RecommendationController {
  constructor(private readonly recommendations: RecommendationService) {}

  @Get()
  latest(
    @CurrentUser() user: AuthUser,
    @Query('mode') mode?: RecommendationMode,
  ) {
    return this.recommendations.latest(user.id, mode ?? 'FOR_YOU');
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50) : 10;
    return this.recommendations.history(user.id, cursor, parsedLimit);
  }

  @Get('match/:mediaId')
  match(@CurrentUser() user: AuthUser, @Param('mediaId') mediaId: string) {
    return this.recommendations.matchForMedia(user.id, mediaId);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateDto) {
    const mode = dto.mode ?? 'FOR_YOU';
    if (mode === 'SIMILAR_TO' && !dto.similarToId?.trim()) {
      throw new BadRequestException({
        code: 'SIMILAR_TO_ID_REQUIRED',
        message: 'similarToId is required when mode is SIMILAR_TO',
      });
    }
    if (mode === 'MOOD' && !dto.mood) {
      throw new BadRequestException({
        code: 'MOOD_REQUIRED',
        message: 'mood is required when mode is MOOD',
      });
    }
    return this.recommendations.generate(user.id, {
      mode,
      mediaType: dto.mediaType,
      similarToId: dto.similarToId,
      mood: dto.mood,
      timeAvailableMinutes: dto.timeAvailableMinutes,
      language: dto.language,
      count: dto.count ?? 10,
    });
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.recommendations.getById(user.id, id);
  }
}
