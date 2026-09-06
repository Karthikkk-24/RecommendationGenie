import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasteModule } from '../taste/taste.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, TasteModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
