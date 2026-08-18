import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from './common/cache/cache.module';
import { JobsModule } from './common/jobs/jobs.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { HealthModule } from './modules/health/health.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { LibraryModule } from './modules/library/library.module';
import { MediaModule } from './modules/media/media.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { SearchModule } from './modules/search/search.module';
import { TasteModule } from './modules/taste/taste.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { singleLine: true } },
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    PrismaModule,
    CacheModule,
    JobsModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    MediaModule,
    SearchModule,
    LibraryModule,
    InteractionsModule,
    FeedbackModule,
    TasteModule,
    RecommendationModule,
    EmbeddingModule,
    AiModule,
    AnalyticsModule,
    AdminModule,
    HealthModule,
    OnboardingModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
