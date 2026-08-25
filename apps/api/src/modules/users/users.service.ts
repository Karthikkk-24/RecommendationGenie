import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { supportedMediaTypeValues, type MediaType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(8)
  preferredLanguage?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(8)
  country?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  imageUrl?: string | null;
}

export class UpdateMediaTypesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(supportedMediaTypeValues, { each: true })
  mediaTypes!: MediaType[];
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailRecommendations?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDigest?: boolean;

  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async me(user: AuthUser) {
    const record = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        preference: true,
        tasteProfile: true,
        notificationPreference: true,
      },
    });
    if (!record) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const { passwordHash: _passwordHash, ...safe } = record;
    return {
      ...safe,
      emailVerificationRequired: this.auth.isEmailVerificationRequired(),
    };
  }

  async updateMe(user: AuthUser, dto: UpdateUserDto) {
    return this.prisma.client.user.update({
      where: { id: user.id },
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        imageUrl: true,
        preferredLanguage: true,
        country: true,
        onboardingStatus: true,
        emailVerifiedAt: true,
        role: true,
      },
    });
  }

  async deleteMe(user: AuthUser): Promise<void> {
    await this.prisma.client.user.delete({ where: { id: user.id } });
  }

  async updateMediaTypes(user: AuthUser, dto: UpdateMediaTypesDto) {
    if (dto.mediaTypes.length === 0) {
      throw new BadRequestException({
        code: 'MEDIA_TYPES_REQUIRED',
        message: 'Select at least one media type',
      });
    }
    return this.prisma.client.userPreference.upsert({
      where: { userId: user.id },
      update: { enabledMediaTypes: dto.mediaTypes },
      create: { userId: user.id, enabledMediaTypes: dto.mediaTypes },
    });
  }

  async getNotificationPreferences(user: AuthUser) {
    return this.prisma.client.userNotificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  async updateNotificationPreferences(user: AuthUser, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.client.userNotificationPreference.upsert({
      where: { userId: user.id },
      update: dto,
      create: { userId: user.id, ...dto },
    });
  }
}
