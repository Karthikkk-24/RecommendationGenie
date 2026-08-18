import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@recommendation-genie/prisma';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  client!: PrismaClient;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const { createPrismaClient } = await import('@recommendation-genie/prisma');
    this.client = createPrismaClient(this.config.getOrThrow<string>('DATABASE_URL'));
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
