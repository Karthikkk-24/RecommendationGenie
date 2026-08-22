import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isRequired()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    const record = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });

    if (!record?.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email to continue with onboarding and recommendations',
      });
    }

    return true;
  }

  private isRequired(): boolean {
    const raw = this.config.get<string>('REQUIRE_EMAIL_VERIFICATION');
    if (raw === undefined || raw === '') {
      return this.config.get<string>('NODE_ENV') === 'production';
    }
    return raw === 'true' || raw === '1';
  }
}
