import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  OnboardingPreferencesDto,
  OnboardingRatingsDto,
  OnboardingSelectionsDto,
  OnboardingTypesDto,
} from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  state(@CurrentUser() user: AuthUser) {
    return this.onboarding.getState(user.id);
  }

  @Post('types')
  types(@CurrentUser() user: AuthUser, @Body() dto: OnboardingTypesDto) {
    return this.onboarding.setTypes(user.id, dto);
  }

  @Post('selections')
  selections(@CurrentUser() user: AuthUser, @Body() dto: OnboardingSelectionsDto) {
    return this.onboarding.select(user.id, dto);
  }

  @Post('ratings')
  ratings(@CurrentUser() user: AuthUser, @Body() dto: OnboardingRatingsDto) {
    return this.onboarding.rate(user.id, dto);
  }

  @Post('preferences')
  preferences(@CurrentUser() user: AuthUser, @Body() dto: OnboardingPreferencesDto) {
    return this.onboarding.preferences(user.id, dto);
  }

  @Post('complete')
  complete(@CurrentUser() user: AuthUser) {
    return this.onboarding.complete(user.id);
  }
}
