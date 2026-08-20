import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH } from '@recommendation-genie/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResendVerificationDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.register(dto);
    this.setCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.login(dto);
    this.setCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.rg_refresh);
    res.clearCookie('rg_access', this.auth.cookieOptions());
    res.clearCookie('rg_refresh', this.auth.cookieOptions());
    return { ok: true };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(req.cookies?.rg_refresh);
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

  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const options = this.auth.cookieOptions();
    res.cookie('rg_access', accessToken, { ...options, maxAge: AUTH.accessTokenTtlSeconds * 1000 });
    res.cookie('rg_refresh', refreshToken, { ...options, maxAge: AUTH.refreshTokenTtlSeconds * 1000 });
  }
}
