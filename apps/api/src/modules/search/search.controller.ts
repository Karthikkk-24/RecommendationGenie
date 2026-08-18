import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import type { MediaType } from '@recommendation-genie/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MediaService } from '../media/media.service';

class SearchDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsString()
  type?: MediaType;
}

@Controller('search')
export class SearchController {
  constructor(
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async search(@Query() query: SearchDto, @CurrentUser() user: AuthUser) {
    await this.prisma.client.searchHistory.create({
      data: { userId: user.id, query: query.q, mediaType: query.type },
    });
    return this.media.search(query.q, query.type);
  }
}
