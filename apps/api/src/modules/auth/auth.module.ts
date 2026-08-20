import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtAuthGuard, RolesGuard, EmailVerifiedGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, EmailVerifiedGuard],
})
export class AuthModule {}
