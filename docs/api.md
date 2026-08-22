# API

NestJS REST. Swagger at `/docs`. Envelope:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "MEDIA_NOT_FOUND", "message": "Media item not found" } }
```

Auth cookies: `rg_access`, `rg_refresh`. Refresh tokens are opaque (stored hashed in Postgres), not JWTs.

| Method | Path | Notes |
| --- | --- | --- |
| POST | /auth/register | |
| POST | /auth/login | rate limited |
| POST | /auth/logout | clears cookies + revokes refresh token |
| POST | /auth/refresh | rotates opaque refresh token |
| POST | /auth/forgot-password | |
| POST | /auth/reset-password | |
| POST | /auth/verify-email | |
| POST | /auth/resend-verification | |
| GET | /users/me | |
| PATCH | /users/me | |
| DELETE | /users/me | |
| GET | /profiles/me | |
| PATCH | /profiles/me | |
| GET | /media/search | legacy alias |
| GET | /media/popular | |
| GET | /media/:id | |
| GET | /media/:id/similar | |
| GET | /search | grouped results; `q`, optional `type`, `page`, `pageSize` |
| GET | /search/history | recent queries |
| GET | /library | filters: `filter`, `type`, `sort` |
| POST | /library | body `{ mediaItemId }` |
| DELETE | /library/:mediaItemId | |
| POST | /interactions | updates taste |
| GET | /interactions | recent interactions |
| GET | /interactions/ratings | `{ mediaItemId, rating }[]` |
| POST | /feedback | structured reasons |
| GET | /feedback | recent feedback |
| GET | /taste-profile | |
| GET | /taste-profile/history | |
| GET | /taste-profile/evolution | |
| PATCH | /taste-profile/preferences | |
| GET | /onboarding | state + popular titles |
| POST | /onboarding/types | |
| POST | /onboarding/selections | |
| POST | /onboarding/ratings | |
| POST | /onboarding/preferences | |
| POST | /onboarding/complete | |
| POST | /onboarding/calibrate | |
| GET | /recommendations | latest batch; `mode` query |
| POST | /recommendations/generate | pipeline |
| GET | /recommendations/history | cursor pagination: `cursor`, `limit` |
| GET | /recommendations/match/:mediaId | on-demand match score |
| GET | /recommendations/:id | single generation |
| GET | /analytics/overview | rates + totals |
| GET | /health | |
| GET | /admin/health | ADMIN role |
| GET | /admin/ai-failures | ADMIN role |
| GET | /admin/algorithm-versions | ADMIN role |

Frontend calls `/api/...` which rewrites to the Nest routes above.
