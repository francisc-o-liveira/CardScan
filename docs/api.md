# API

Base URL: `http://localhost:4100/api` (dev). All responses use a consistent envelope:

```json
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

## Auth

| Method | Path                        | Auth | Notes                                                                 |
| ------ | ---------------------------- | ---- | ---------------------------------------------------------------------- |
| POST   | `/auth/register`             | —    | Creates the user plus an empty `Collection` and `Wishlist`.            |
| POST   | `/auth/login`                | —    | Rate-limited (20 req / 15 min per IP).                                 |
| POST   | `/auth/logout`               | —    | Revokes the current refresh token.                                     |
| POST   | `/auth/refresh`              | —    | Rotates the refresh token; returns a new access token.                 |
| GET    | `/auth/me`                   | Bearer | Returns the authenticated user.                                       |
| POST   | `/auth/forgot-password`      | —    | Always returns success regardless of whether the email exists. Logs the reset link to the server console (no mailer wired up yet). |
| POST   | `/auth/reset-password`       | —    | Consumes the reset token, revokes all existing refresh tokens.         |

### Mobile vs. web refresh token delivery

Send header `x-client-type: mobile` to receive the refresh token in the response body (for `expo-secure-store`). Omit it (web) to receive it as an `HttpOnly` cookie instead — the body's `tokens.refreshToken` field is omitted in that case.

## Catalog (Pokémon, via TCGdex)

Read-only. Populated by `pnpm sync:pokemon` (see [`docs/database.md`](database.md#pokémon-catalog-sync)).

| Method | Path                | Notes                                                                 |
| ------ | -------------------- | ------------------------------------------------------------------- |
| GET    | `/tcgs`               | List TCGs.                                                           |
| GET    | `/sets?tcg=pokemon`   | List sets, optionally filtered by TCG slug.                          |
| GET    | `/sets/:id`           | A single set with its cards.                                        |
| GET    | `/cards`              | Paginated (`page`, `limit`), filterable by `tcg`, `setId`, `query` (name, case-insensitive). |
| GET    | `/cards/:id`          | A single card with its set, TCG, and variants.                      |

## Planned (later phases)

`/api/scans`, `/api/collection`, `/api/wishlist`, `/api/decks` — schema and types already exist (see `prisma/schema.prisma`, `packages/types`), routes will be added as each phase lands.
