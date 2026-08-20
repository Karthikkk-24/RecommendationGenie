import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from '../src/modules/health/health.controller';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

describe('API e2e (mocked deps)', () => {
  let app: INestApplication<App>;
  const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  const register = jest.fn().mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { id: 'u1', email: 'a@b.co', onboardingStatus: 'NOT_STARTED' },
  });

  beforeEach(async () => {
    queryRaw.mockClear();
    register.mockClear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, AuthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { client: { $queryRaw: queryRaw } },
        },
        {
          provide: AuthService,
          useValue: {
            register,
            login: jest.fn(),
            logout: jest.fn(),
            refresh: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerification: jest.fn(),
            cookieOptions: () => ({ httpOnly: true, path: '/' }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health pings the database', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(queryRaw).toHaveBeenCalled();
  });

  it('GET /health returns 503 when database is down', async () => {
    queryRaw.mockRejectedValueOnce(new Error('db down'));
    await request(app.getHttpServer()).get('/health').expect(503);
  });

  it('POST /auth/register rejects invalid payloads', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', username: 'ab', name: 'A', password: 'short' })
      .expect(400);
    expect(register).not.toHaveBeenCalled();
  });

  it('POST /auth/register accepts a valid payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e@example.com',
        username: 'e2e_user',
        name: 'E2E User',
        password: 'password-long-enough',
      })
      .expect(201);
    expect(register).toHaveBeenCalled();
  });
});
