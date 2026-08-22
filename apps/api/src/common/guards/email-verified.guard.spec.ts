import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailVerifiedGuard } from './email-verified.guard';

describe('EmailVerifiedGuard', () => {
  const prisma = {
    client: {
      user: {
        findUnique: jest.fn(),
      },
    },
  };

  function createGuard(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;
    return new EmailVerifiedGuard(config, prisma as never);
  }

  function context(user?: { id: string; email: string; role: 'USER' | 'ADMIN' }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('skips verification when REQUIRE_EMAIL_VERIFICATION=false', async () => {
    const guard = createGuard({ REQUIRE_EMAIL_VERIFICATION: 'false', NODE_ENV: 'production' });
    await expect(guard.canActivate(context({ id: 'u1', email: 'a@b.c', role: 'USER' }))).resolves.toBe(true);
    expect(prisma.client.user.findUnique).not.toHaveBeenCalled();
  });

  it('defaults to required in production when the flag is unset', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ emailVerifiedAt: null });
    const guard = createGuard({ NODE_ENV: 'production' });
    await expect(guard.canActivate(context({ id: 'u1', email: 'a@b.c', role: 'USER' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows verified users when enforcement is on', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ emailVerifiedAt: new Date() });
    const guard = createGuard({ REQUIRE_EMAIL_VERIFICATION: 'true' });
    await expect(guard.canActivate(context({ id: 'u1', email: 'a@b.c', role: 'USER' }))).resolves.toBe(true);
  });

  it('returns unauthorized when no user is present', async () => {
    const guard = createGuard({ REQUIRE_EMAIL_VERIFICATION: 'true' });
    await expect(guard.canActivate(context(undefined))).rejects.toMatchObject({
      response: { code: 'UNAUTHORIZED' },
    });
  });
});
