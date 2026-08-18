import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TasteService } from './taste.service';

@Controller('taste-profile')
@UseGuards(JwtAuthGuard)
export class TasteController {
  constructor(private readonly taste: TasteService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return this.taste.getProfile(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.taste.history(user.id);
  }

  @Get('evolution')
  evolution(@CurrentUser() user: AuthUser) {
    return this.taste.evolution(user.id);
  }
}
