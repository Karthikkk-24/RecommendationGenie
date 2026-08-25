import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { mediaTypeValues, type MediaType } from '@recommendation-genie/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MediaService } from '../media/media.service';

class SearchDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsEnum(mediaTypeValues)
  type?: MediaType;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

@Controller('search')
export class SearchController {
  constructor(
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async search(@Query() query: SearchDto, @CurrentUser() user: AuthUser) {
    await this.prisma.client.searchHistory.create({
      data: { userId: user.id, query: query.q, mediaType: query.type },
    });
    return this.media.search(query.q, query.type, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  async history(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.client.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, query: true, mediaType: true, createdAt: true },
    });
    // Dedupe by query (most recent wins) for a tidy recent list.
    const seen = new Set<string>();
    const unique: typeof rows = [];
    for (const row of rows) {
      const key = row.query.trim().toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(row);
      if (unique.length >= 8) {
        break;
      }
    }
    return unique;
  }
}
