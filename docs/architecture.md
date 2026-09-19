# Architecture

## Overview

CardScan is a pnpm monorepo with three deployable apps (`apps/web`, `apps/mobile`, `apps/api`) and three shared packages (`packages/types`, `packages/validation`, `packages/config`). Web and mobile never talk to the database directly — both go through the same Express REST API, so business logic exists exactly once.

```
apps/web  ──┐
            ├──> apps/api ──> PostgreSQL (via Prisma)
apps/mobile─┘         │
                       └──> Redis (reserved for caching, not yet used)
```

## Why a shared `packages/` layer

Request/response shapes and validation rules are defined once in `packages/types` and `packages/validation` and imported by all three apps. This is what `packages/validation`'s Zod schemas buy you concretely: the exact same `loginSchema` validates the login form in the browser, the login form in the Expo app, and the request body on the server — so a rule change (say, a new password requirement) is a one-line diff instead of three.

## Auth flow

- Access tokens are short-lived JWTs (`JWT_SECRET`), returned in the response body and kept in memory on the client (never in `localStorage`, to limit XSS exposure).
- Refresh tokens are opaque random strings, stored hashed in the `refresh_tokens` table (supports multiple concurrent sessions and revocation). Delivery differs by client:
  - **Web** receives it as an `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/auth` — never readable by JS.
  - **Mobile** has no cookie jar, so it receives the refresh token in the JSON response body and stores it in `expo-secure-store`. It identifies itself with an `x-client-type: mobile` request header so the API knows which delivery mechanism to use.
- Refresh tokens rotate on every use (the old one is revoked, a new one issued), limiting the blast radius of a leaked token.

## Recognition & TCG provider abstractions (planned, Phase 2–3)

The brief calls for two abstractions that don't exist yet but the schema and types are already shaped for:

- `TCGProvider` — normalizes an external card data source (Pokémon TCG API, Scryfall, etc.) into CardScan's `Card`/`CardSet` schema, so a provider swap never touches the database shape.
- `CardRecognitionProvider` — takes an image buffer, returns a `CardRecognitionResult` with confidence-scored candidates. Multiple signals (OCR, visual matching, metadata matching) combine into one confidence score; low-confidence results always require user confirmation rather than silently picking a candidate.

## Phases

See the [README](../README.md#roadmap) for the phase breakdown. Only Phase 1 (this pass) is implemented.
