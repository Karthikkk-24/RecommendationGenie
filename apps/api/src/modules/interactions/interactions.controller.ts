import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { InteractionsService } from './interactions.service';

@Controller('interactions')
@UseGuards(JwtAuthGuard)
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInteractionDto) {
    return this.interactions.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.interactions.list(user.id);
  }

  @Get('ratings')
  listRatings(@CurrentUser() user: AuthUser) {
    return this.interactions.listRatings(user.id);
  }
}
