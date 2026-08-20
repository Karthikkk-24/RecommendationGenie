# Development

## Requirements

- Node 20+
- pnpm 10
- A Neon (or local pgvector) Postgres URL

## First run

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Deployment

See [deployment.md](./deployment.md) for Vercel + Render/Railway + Neon. Bind the API to `0.0.0.0:$PORT`.

Email verification links are printed to the API console when `RESEND_API_KEY` is empty. `EmailVerifiedGuard` gates onboarding and recommendations: set `REQUIRE_EMAIL_VERIFICATION=false` for local console-email workflows. When the flag is unset, enforcement defaults on in `NODE_ENV=production` and off otherwise.

## Tests

```bash
pnpm test
```

The important unit test lives at `apps/api/src/modules/recommendation/loop.spec.ts`: after `TOO_SLOW` feedback, slow-content scores fall relative to faster items. MMR diversity is covered in the same file.

## Deployment

- Web: Vercel, `API_URL` pointing at the Nest service (or same-origin reverse proxy)
- API: Render / Railway / any Node host, bind `0.0.0.0:$PORT`
- Database: Neon, run `pnpm db:migrate:deploy` then `pnpm db:seed` for demo catalogs
- Set `NODE_ENV=production`, strong JWT secrets, `AI_MOCK=false` only when an `OPENAI_API_KEY` is present
