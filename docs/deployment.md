# Deployment

MVP split: Next.js on Vercel, NestJS on Render or Railway, Neon for Postgres. Do not run `npx convex deploy` — this stack uses Prisma against Neon.

## Web (Vercel)

1. Import the GitHub repo and set the **Root Directory** to `apps/web`, or keep the monorepo root and set:
   - Install: `pnpm install`
   - Build: `pnpm --filter @recommendation-genie/web build`
2. Environment:
   - `API_URL` — public origin of the Nest service (used by Next rewrites so `/api/*` stays first-party)
   - `NEXT_PUBLIC_API_URL` — `/api` in production (same-origin proxy)
3. Do **not** put TMDB, IGDB, OpenAI, JWT, or database secrets in Vercel public env.

Cookie auth depends on the Next.js `/api/[...path]` route handler, which proxies to Nest and appends every `Set-Cookie` (access + refresh) first-party. Do not rely on `rewrites` for auth cookies.

## API (Render or Railway)

Bind HTTP to `0.0.0.0:$PORT`. Render/Railway inject `PORT`; map it if your start command expects `API_PORT`.

Suggested start:

```bash
pnpm --filter @recommendation-genie/prisma generate
pnpm --filter @recommendation-genie/api build
node apps/api/dist/main.js
```

Or a Dockerfile based on `docker/` if you add one later. Filesystem is ephemeral — never persist uploads or SQLite locally.

Required env:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** URL |
| `DIRECT_DATABASE_URL` | Neon **direct** URL (migrations) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET` | Long random strings |
| `WEB_ORIGIN` | Exact Vercel origin, e.g. `https://genie.example.com` |
| `API_PORT` or `PORT` | Render/Railway port |
| `NODE_ENV` | `production` |
| `MEDIA_PROVIDER_MODE` | `mock` until live keys exist, then `live` |
| `AI_MOCK` | `true` until `OPENAI_API_KEY` is set |
| `REQUIRE_EMAIL_VERIFICATION` | `true` in production if Resend is configured |

Optional live keys: `TMDB_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `LASTFM_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Database (Neon)

1. Create a project; enable the `vector` and `pg_trgm` extensions (the init migration also issues `CREATE EXTENSION`).
2. Copy pooled → `DATABASE_URL`, direct → `DIRECT_DATABASE_URL`.
3. From CI or a one-off job (never from the Vercel web build):

```bash
pnpm db:migrate:deploy
pnpm db:seed   # mock catalog; skip in a real catalog environment
```

Schema and SQL live in `packages/prisma/prisma/migrations`. Applying them requires the URLs above.

## Production checklist

- [ ] Strong JWT/cookie secrets, not the `.env.example` placeholders
- [ ] `WEB_ORIGIN` matches the deployed web origin (CORS + cookies)
- [ ] Helmet + throttler stay enabled (already global in Nest)
- [ ] `AI_MOCK=false` only when OpenAI is configured; otherwise ranking stays deterministic
- [ ] Health: `GET /health` on the API
- [ ] Admin inspect: `GET /admin/health` (role `ADMIN`)
