import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  mediaTypeValues,
  moodValues,
  recommendationModeValues,
  type MediaType,
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
  @IsEnum(mediaTypeValues)
  mediaType?: MediaType;

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
  history(@CurrentUser() user: AuthUser) {
    return this.recommendations.history(user.id);
  }

  @Get('match/:mediaId')
  match(@CurrentUser() user: AuthUser, @Param('mediaId') mediaId: string) {
    return this.recommendations.matchForMedia(user.id, mediaId);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateDto) {
    return this.recommendations.generate(user.id, {
      mode: dto.mode ?? 'FOR_YOU',
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
