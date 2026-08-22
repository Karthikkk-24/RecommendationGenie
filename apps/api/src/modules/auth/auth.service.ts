import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AUTH } from '@recommendation-genie/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { MailService } from './mail.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.client.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }] },
    });
    if (existing) {
      throw new ConflictException({ code: 'USER_EXISTS', message: 'Email or username already registered' });
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        name: dto.name,
        passwordHash,
        profile: { create: {} },
        preference: { create: { enabledMediaTypes: [] } },
        tasteProfile: { create: {} },
        notificationPreference: { create: {} },
      },
    });

    const verifyToken = await this.issueEmailToken(user.id, 'VERIFY_EMAIL');
    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    await this.mail.send(
      user.email,
      'Verify your Recommendation Genie account',
      `Welcome to Genie. Verify your email: ${webOrigin}/verify-email?token=${verifyToken}`,
    );

    return this.issueSession(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.client.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    return this.issueSession(user.id, user.email, user.role);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Missing refresh token' });
    }
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token is invalid' });
    }
    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(stored.user.id, stored.user.email, stored.user.role);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return;
    }
    const token = await this.issueEmailToken(user.id, 'RESET_PASSWORD');
    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    await this.mail.send(
      user.email,
      'Reset your Genie password',
      `Reset your password: ${webOrigin}/reset-password?token=${token}`,
    );
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.consumeEmailToken(token, 'RESET_PASSWORD');
    await this.prisma.client.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await argon2.hash(password),
        sessionVersion: { increment: 1 },
      },
    });
    await this.prisma.client.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    }
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash: await argon2.hash(newPassword),
        sessionVersion: { increment: 1 },
      },
    });
    await this.prisma.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.consumeEmailToken(token, 'VERIFY_EMAIL');
    await this.prisma.client.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailVerifiedAt) {
      return;
    }
    const verifyToken = await this.issueEmailToken(user.id, 'VERIFY_EMAIL');
    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    await this.mail.send(
      user.email,
      'Verify your Recommendation Genie account',
      `Verify your email: ${webOrigin}/verify-email?token=${verifyToken}`,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: AuthUser['role'];
        sv?: number;
      }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      const user = await this.prisma.client.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, sessionVersion: true },
      });
      if (!user) {
        throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User no longer exists' });
      }
      if ((payload.sv ?? 0) !== user.sessionVersion) {
        throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'Session expired. Sign in again.' });
      }
      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid access token' });
    }
  }

  cookieOptions() {
    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      signed: true,
    };
  }

  isEmailVerificationRequired(): boolean {
    const raw = this.config.get<string>('REQUIRE_EMAIL_VERIFICATION');
    if (raw === undefined || raw === '') {
      return this.config.get<string>('NODE_ENV') === 'production';
    }
    return raw === 'true' || raw === '1';
  }

  private async issueSession(userId: string, email: string, role: AuthUser['role']) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, role: true, onboardingStatus: true, emailVerifiedAt: true, sessionVersion: true },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, sv: user.sessionVersion },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: `${AUTH.accessTokenTtlSeconds}s` },
    );
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + AUTH.refreshTokenTtlSeconds * 1000),
      },
    });
    return { accessToken, refreshToken, user };
  }

  private async issueEmailToken(userId: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.client.emailToken.create({
      data: {
        userId,
        purpose,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + AUTH.emailTokenTtlSeconds * 1000),
      },
    });
    return token;
  }

  private async consumeEmailToken(token: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    const record = await this.prisma.client.emailToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token is invalid or expired' });
    }
    await this.prisma.client.emailToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
