# Architecture

Recommendation Genie is a pnpm monorepo with a Next.js client and a NestJS API sharing types, config, and Prisma.

```
apps/web  → same-origin /api rewrite → apps/api → Prisma → Neon Postgres
                                      ↘ media adapters (mock / TMDB / TMDB TV / IGDB / MusicBrainz / Last.fm)
                                      ↘ AI SDK (OpenAI or mock)
```

Live media coverage (`MEDIA_PROVIDER_MODE=live`): TMDB movies, TMDB TV, IGDB games, MusicBrainz + Last.fm music, plus mock as a soft fallback source.

Schema enums also include `BOOK`, `ANIME`, and `PODCAST`. Those types have no live adapters yet: generate/onboarding only accept supported types (`MOVIE`, `GAME`, `MUSIC`, `TV_SHOW`), while the mock provider + seed catalog include sample titles for local search/browse.

Cookies (`rg_access`, `rg_refresh`) are HTTP-only. The browser never stores JWTs in `localStorage`. Next.js proxies `/api/*` to Nest so cookies stay first-party.

Business logic lives in Nest services. Controllers validate DTOs and return data. Shared domain enums and Zod schemas live in `packages/types`.

The recommendation pipeline is versioned (`v1.0`). Scoring weights are centralized in `packages/config` and `RecommendationConfig`. AI never invents catalog titles; when live OpenAI is configured it only reranks and explains an already-scored candidate set. With `AI_MOCK=true` or no `OPENAI_API_KEY`, and on live OpenAI errors, the pipeline keeps the deterministic ranked order and grounded template explanations — it does not invent a separate recovery catalog.
