# Architecture

Recommendation Genie is a pnpm monorepo with a Next.js client and a NestJS API sharing types, config, and Prisma.

```
apps/web  → same-origin /api rewrite → apps/api → Prisma → Neon Postgres
                                      ↘ media adapters (mock / TMDB / IGDB / MusicBrainz)
                                      ↘ AI SDK (OpenAI or mock)
```

Cookies (`rg_access`, `rg_refresh`) are HTTP-only. The browser never stores JWTs in `localStorage`. Next.js proxies `/api/*` to Nest so cookies stay first-party.

Business logic lives in Nest services. Controllers validate DTOs and return data. Shared domain enums and Zod schemas live in `packages/types`.

The recommendation pipeline is versioned (`v1.0`). Scoring weights are centralized in `packages/config` and `RecommendationConfig`. AI never invents catalog titles; it reranks and explains a scored candidate set. Failed or missing AI falls back to deterministic ranking.
