import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { mediaTypeValues, paginationQuerySchema, type MediaType } from '@recommendation-genie/types';
import { MediaService } from './media.service';

class SearchQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsEnum(mediaTypeValues)
  type?: MediaType;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    const pagination = paginationQuerySchema.parse({
      page: query.page,
      pageSize: query.pageSize,
    });
    return this.media.search(query.q, query.type, pagination.page, pagination.pageSize);
  }

  @Get('popular')
  popular(@Query('type') type?: MediaType) {
    return this.media.popular(type);
  }

  @Get(':id/similar')
  similar(@Param('id') id: string) {
    return this.media.similar(id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.media.getById(id);
  }
}
