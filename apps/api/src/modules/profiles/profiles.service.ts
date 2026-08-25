import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(user: AuthUser) {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
    }
    return profile;
  }

  async updateMine(user: AuthUser, dto: UpdateProfileDto) {
    return this.prisma.client.profile.upsert({
      where: { userId: user.id },
      update: { ...(dto.bio !== undefined ? { bio: dto.bio } : {}) },
      create: { userId: user.id, bio: dto.bio ?? null },
    });
  }
}
