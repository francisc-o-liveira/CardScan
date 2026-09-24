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

Filter with `?tcg=pokemon|magic|yugioh`. Yu-Gi-Oh! is populated by `pnpm sync:yugioh` (see [`docs/database.md`](database.md#yu-gi-oh-catalog-sync)).

## Static assets

| Method | Path                            | Notes |
| ------ | ------------------------------- | ----- |
| GET    | `/assets/yugioh/cards/:id.jpg`  | Re-hosted Yu-Gi-Oh! card images. Long-lived cache headers, and `Cross-Origin-Resource-Policy: cross-origin` so the web app (another origin in dev) can display them. Unknown paths return the standard 404 envelope. |

## Scans

Card recognition — see [recognition.md](recognition.md). All routes need a Bearer token and only ever
return the caller's own scans.

| Method | Path                  | Notes |
| ------ | --------------------- | ----- |
| POST   | `/scans`              | Multipart, one photo in the `image` field (≤10MB) and, optionally, a `tcg` field (a game slug) to search only that game: with every game in one index, a card can otherwise be mistaken for one from another game. Stores the photo, recognises the card and returns the `Scan` with ranked `candidates` and a `confidence`. 30 req/min per IP. `503 SERVICE_UNAVAILABLE` until the recognition index is built. |
| GET    | `/scans`              | The 50 most recent scans, newest first. |
| GET    | `/scans/:id`          | One scan. |
| POST   | `/scans/:id/confirm`  | `{ cardId }` — the card the photo really showed (any catalog card, not only a candidate). Also records it in `RecognitionFeedback`. |

## Collection

The signed-in user's cards. A card can have several groups of copies (one per condition and language);
adding copies that match an existing group adds to its quantity instead of creating a new row.

| Method | Path                         | Notes |
| ------ | ---------------------------- | ----- |
| GET    | `/collection`                | Owned cards with their copies and total quantity. Paginated (`page`, `limit`), filterable by `query` (name), `tcg`, `setId`, `condition`. |
| GET    | `/collection/summary`        | `totalCards` (copies), `uniqueCards`, `totalSets`, `perGame`, `scans` — for Home and Profile. |
| GET    | `/collection/cards/:cardId`  | The user's copies of one card, or `null`. |
| POST   | `/collection/items`          | `{ cardId, quantity = 1, condition = "NM", language = "en", scanId? }`. With `scanId`, also confirms that scan as the card (and records the feedback). |
| PATCH  | `/collection/items/:id`      | `{ quantity?, condition?, language? }`. `quantity: 0` removes the group; moving it onto an existing condition + language merges the two. Returns the card's copies, or `null` when none are left. |
| DELETE | `/collection/items/:id`      | Removes a group of copies. |

## Images

| Method | Path                  | Notes |
| ------ | --------------------- | ----- |
| GET    | `/images?url=`        | Fetches a card image once from an allowlisted host (`cards.scryfall.io`, https only), stores it and redirects to the copy under `/assets/proxy`. For networks that can't reach the image CDN. |

## Quota, premium and rewarded ads

Scanning is limited for free users: everyone starts with `WELCOME_SCAN_CREDITS` scans (once), then each watched rewarded ad gives `REWARDED_AD_CREDITS` more. `FREE_SCANS_PER_DAY` (0 by default) adds an optional daily allowance. Premium users are not limited. Card data, search, prices and the collection are never limited (see `docs/monetization.md`).

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/quota`                    | Auth. `ScanQuota`: premium, free scans left, credits, when the free scans come back, ads still worth watching today. |
| POST   | `/scans`                    | Also spends one scan. With none left: `402 QUOTA_EXCEEDED` whose `details` is the `ScanQuota`. A scan that fails on our side is given back. |
| POST   | `/billing/checkout`         | Auth. `{ product: "monthly" \| "yearly" \| "scans_25" \| "scans_100" }`. Returns `{ url }`, the Stripe Checkout page (web): a subscription for a plan, a one-off payment for a scan pack. `503` until Stripe is configured. |
| POST   | `/billing/revenuecat`       | RevenueCat webhook (Android). `Authorization: Bearer REVENUECAT_WEBHOOK_SECRET`. The app logs into RevenueCat with our user id. |
| POST   | `/billing/stripe/webhook`   | Stripe webhook, signature checked on the raw body. |
| POST   | `/ads/web/start`, `/ads/web/complete` | Auth. Web rewarded ads: `start` opens a timed session, `complete` (`{ sessionId }`) adds the scans once the session ran `WEB_AD_MIN_SECONDS`, once, up to `WEB_ADS_PER_DAY` a day. |
| GET    | `/ads/ssv`                  | AdMob server-side verification callback for a finished rewarded ad. Only a valid Google signature adds credits; one grant per transaction, at most `REWARDED_ADS_PER_DAY` a day. |

## Planned (later phases)

`/api/wishlist`, `/api/decks` — schema and types already exist (see `prisma/schema.prisma`, `packages/types`), routes will be added as each phase lands.
