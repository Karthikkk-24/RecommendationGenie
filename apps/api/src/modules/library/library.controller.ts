import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  libraryFilterValues,
  librarySortValues,
  mediaTypeValues,
  type LibraryFilter,
  type LibrarySort,
  type MediaType,
} from '@recommendation-genie/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LibraryService } from './library.service';

class LibraryQueryDto {
  @IsOptional()
  @IsEnum(libraryFilterValues)
  filter?: LibraryFilter;

  @IsOptional()
  @IsEnum(mediaTypeValues)
  type?: MediaType;

  @IsOptional()
  @IsEnum(librarySortValues)
  sort?: LibrarySort;
}

class AddLibraryDto {
  @IsString()
  mediaItemId!: string;
}

class RemoveLibraryQueryDto {
  @IsOptional()
  @IsEnum(libraryFilterValues)
  filter?: LibraryFilter;
}

@Controller('library')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: LibraryQueryDto) {
    return this.library.list(user.id, query.filter ?? 'ALL', query.type, query.sort);
  }

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: AddLibraryDto) {
    return this.library.add(user.id, dto.mediaItemId);
  }

  @Delete(':mediaItemId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('mediaItemId') mediaItemId: string,
    @Query() query: RemoveLibraryQueryDto,
  ) {
    return this.library.remove(user.id, mediaItemId, query.filter ?? 'SAVED');
  }
}
