# Database

PostgreSQL on Neon. Prisma 7 with `@prisma/adapter-pg`. Enable `vector` and `pg_trgm`.

Pooled `DATABASE_URL` is for the Nest process. `DIRECT_DATABASE_URL` is for migrations.

Taste is split:

- `TasteProfile` — scalar dimensions in `[-1, 1]`
- `TastePreference` — genre/theme/tag/creator/media-type weights
- `TasteProfileSnapshot` — history for the “your taste is changing” view

Media is provider-agnostic: `MediaItem` plus `MediaSource(provider, externalId)`.

Embeddings use `Unsupported("vector")` and raw SQL for cosine / HNSW. Similarity search is not expressed through the Prisma query builder.

Apply:

```bash
pnpm db:migrate
pnpm db:seed
```
