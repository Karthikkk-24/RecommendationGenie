import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { JOB_QUEUE } from '../../common/jobs/jobs.module';
import type { JobQueue } from '../../common/jobs/job-queue';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { TasteService } from '../taste/taste.service';

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
    private readonly taste: TasteService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
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
    const before = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      select: { preferredLanguage: true, country: true },
    });
    const updated = await this.prisma.client.user.update({
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
    const localeChanged =
      (dto.preferredLanguage !== undefined && dto.preferredLanguage !== before?.preferredLanguage) ||
      (dto.country !== undefined && dto.country !== before?.country);
    if (localeChanged) {
      void this.jobs.enqueue('generate-recommendations', {
        userId: user.id,
        mode: 'FOR_YOU',
        count: 10,
      });
    }
    return updated;
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
    const preference = await this.prisma.client.userPreference.upsert({
      where: { userId: user.id },
      update: { enabledMediaTypes: dto.mediaTypes },
      create: { userId: user.id, enabledMediaTypes: dto.mediaTypes },
    });
    await this.taste.syncEnabledMediaTypes(user.id, dto.mediaTypes);
    return preference;
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
