import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'recommendation-genie-api', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'recommendation-genie-api',
        database: 'down',
      });
    }
  }
}
