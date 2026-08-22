import { Controller, Delete, Get, Patch, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto, UpdateMediaTypesDto, UpdateNotificationPreferencesDto, UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(user, dto);
  }

  @Patch('me/media-types')
  updateMediaTypes(@CurrentUser() user: AuthUser, @Body() dto: UpdateMediaTypesDto) {
    return this.users.updateMediaTypes(user, dto);
  }

  @Get('me/notification-preferences')
  notificationPreferences(@CurrentUser() user: AuthUser) {
    return this.users.getNotificationPreferences(user);
  }

  @Patch('me/notification-preferences')
  updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.users.updateNotificationPreferences(user, dto);
  }

  @Delete('me')
  async deleteMe(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.users.deleteMe(user);
    res.clearCookie('rg_access', this.auth.cookieOptions());
    res.clearCookie('rg_refresh', this.auth.cookieOptions());
    return { ok: true };
  }
}
