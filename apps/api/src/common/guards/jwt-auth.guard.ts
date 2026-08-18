import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ cookies?: Record<string, string>; user?: AuthUser }>();
    const token = request.cookies?.rg_access;
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Not authenticated' });
    }
    request.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}
