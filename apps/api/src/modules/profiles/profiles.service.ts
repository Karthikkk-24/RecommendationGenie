import { Injectable } from '@nestjs/common';
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
    return this.prisma.client.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, bio: null },
    });
  }

  async updateMine(user: AuthUser, dto: UpdateProfileDto) {
    return this.prisma.client.profile.upsert({
      where: { userId: user.id },
      update: { ...(dto.bio !== undefined ? { bio: dto.bio } : {}) },
      create: { userId: user.id, bio: dto.bio ?? null },
    });
  }
}
