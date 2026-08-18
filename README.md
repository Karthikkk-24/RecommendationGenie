# Recommendation Genie

Personalized entertainment recommendations for movies, games, and music. Genie learns from what you like, dislike, save, and explain — then scores a real catalog instead of asking an LLM to invent titles.

## Product loop

User interaction → taste profile → candidate generation → ranking → optional AI rerank → recommendation → feedback → taste update

## Stack

- pnpm monorepo
- Next.js 16.3 App Router (`apps/web`)
- NestJS 11 (`apps/api`)
- Neon PostgreSQL + Prisma 7 + pgvector (`packages/prisma`)
- Mock media providers by default

## Local setup

```bash
pnpm install
cp .env.example .env
```

Paste your Neon `DATABASE_URL` and `DIRECT_DATABASE_URL` into `.env` (pooled URL for the app, direct URL for migrations).

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:3001  
Swagger: http://localhost:3001/docs

Optional local Postgres with pgvector:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Then set:

```
DATABASE_URL=postgresql://genie:genie@localhost:5432/recommendation_genie
DIRECT_DATABASE_URL=postgresql://genie:genie@localhost:5432/recommendation_genie
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Web + API |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Playwright + Nest e2e |
| `pnpm db:migrate` | Prisma migrate |
| `pnpm db:seed` | Mock catalog |

## Environment

See `.env.example`. Never put provider or AI keys in Next.js client code. `MEDIA_PROVIDER_MODE=mock` and `AI_MOCK=true` keep CI and local startup off the live APIs.

## Docs

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Recommendation engine](docs/recommendation-engine.md)
- [AI](docs/ai.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
