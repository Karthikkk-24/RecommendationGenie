import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  country?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(user: AuthUser) {
    const record = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      include: { profile: true, preference: true, tasteProfile: true },
    });
    if (!record) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const { passwordHash: _passwordHash, ...safe } = record;
    return safe;
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
}
