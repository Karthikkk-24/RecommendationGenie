import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH } from '@recommendation-genie/config';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.register(dto);
    this.setCookies(res, session.accessToken, session.refreshToken);
    return {
      user: session.user,
      emailVerificationRequired: this.auth.isEmailVerificationRequired(),
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.login(dto);
    this.setCookies(res, session.accessToken, session.refreshToken);
    return {
      user: session.user,
      emailVerificationRequired: this.auth.isEmailVerificationRequired(),
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = this.readCookie(req, 'rg_refresh');
    await this.auth.logout(refresh);
    res.clearCookie('rg_access', this.auth.cookieOptions());
    res.clearCookie('rg_refresh', this.auth.cookieOptions());
    return { ok: true };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(this.readCookie(req, 'rg_refresh'));
    this.setCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { ok: true };
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto.email);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const options = this.auth.cookieOptions();
    res.cookie('rg_access', accessToken, { ...options, maxAge: AUTH.accessTokenTtlSeconds * 1000 });
    res.cookie('rg_refresh', refreshToken, { ...options, maxAge: AUTH.refreshTokenTtlSeconds * 1000 });
  }

  private readCookie(req: Request, name: string): string | undefined {
    const signed = req.signedCookies?.[name];
    if (typeof signed === 'string' && signed.length > 0) {
      return signed;
    }
    return req.cookies?.[name];
  }
}
