# API

NestJS REST. Swagger at `/docs`. Envelope:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "MEDIA_NOT_FOUND", "message": "Media item not found" } }
```

Auth cookies: `rg_access`, `rg_refresh`.

| Method | Path | Notes |
| --- | --- | --- |
| POST | /auth/register | |
| POST | /auth/login | rate limited |
| POST | /auth/logout | |
| POST | /auth/refresh | |
| POST | /auth/forgot-password | |
| POST | /auth/reset-password | |
| GET | /users/me | |
| PATCH | /users/me | |
| DELETE | /users/me | |
| GET | /media/search | |
| GET | /media/:id | |
| GET | /media/:id/similar | |
| GET | /search | grouped results |
| GET | /library | |
| POST | /library | |
| DELETE | /library/:id | |
| POST | /interactions | updates taste |
| GET | /interactions | |
| POST | /feedback | structured reasons |
| GET | /taste-profile | |
| GET | /taste-profile/history | |
| GET | /taste-profile/evolution | |
| GET | /recommendations | latest |
| POST | /recommendations/generate | pipeline |
| GET | /recommendations/history | |
| GET | /recommendations/:id | |
| GET | /analytics/overview | |
| GET | /health | |
| GET | /admin/* | ADMIN role |

Frontend calls `/api/...` which rewrites to the Nest routes above.
