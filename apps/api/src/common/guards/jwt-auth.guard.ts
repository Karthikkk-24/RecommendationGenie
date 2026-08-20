import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import type { AuthUser } from '../decorators/current-user.decorator';

type CookieRequest = {
  cookies?: Record<string, string>;
  signedCookies?: Record<string, string | false>;
  user?: AuthUser;
};

function readCookie(request: CookieRequest, name: string): string | undefined {
  const signed = request.signedCookies?.[name];
  if (typeof signed === 'string' && signed.length > 0) {
    return signed;
  }
  return request.cookies?.[name];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CookieRequest>();
    const token = readCookie(request, 'rg_access');
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Not authenticated' });
    }
    request.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}
