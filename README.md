# CardScan

**Scan. Identify. Collect.**

CardScan is a cross-platform TCG card recognition and collection management platform, starting with Pokémon and Magic: The Gathering. This repository is a pnpm monorepo containing the API, web app, mobile app, and shared packages.

> Pokémon and Magic: The Gathering are trademarks of their respective owners. CardScan is not affiliated with or endorsed by these companies.

## Status

**Phase 1 — Foundation** is done: monorepo scaffolding, authentication (register/login/refresh/logout/forgot-password/reset-password), the full core database schema, and a navigable web + mobile shell.

**Phase 2 — Card database** has started: the full Pokémon catalog (205 sets, ~21.3k physical cards, ~92% with card images) is imported from [TCGdex](https://tcgdex.dev) via `pnpm sync:pokemon`, and the full Magic: The Gathering catalog (1,051 sets, ~109k paper cards, >99% with images) from [Scryfall](https://scryfall.com/docs/api) via `pnpm sync:magic` — both queryable through read-only `/api/tcgs`, `/api/sets`, `/api/cards` endpoints. Yu-Gi-Oh! (~45k printings of ~14.5k cards, via [YGOPRODeck](https://ygoprodeck.com/api-guide/), `pnpm sync:yugioh`) is imported too, with its images downloaded and re-hosted by the API because YGOPRODeck forbids hotlinking. **All eight games the app lists now have real catalogs**: the five newest — Disney Lorcana ([Lorcast](https://lorcast.com/docs/api)), One Piece ([OPTCG API](https://optcgapi.com)), Digimon ([digimoncard.io](https://digimoncard.io/api)), Star Wars: Unlimited ([SWU-DB](https://www.swu-db.com/api)) and Flesh and Blood ([fab-cube dataset](https://github.com/the-fab-cube/flesh-and-blood-cards)) — are imported through one shared sync (`pnpm sync:others`), all from free, keyless sources. Both the web and mobile apps have a searchable Card Database (mobile: infinite scroll, TCG chips, set picker).

**Phase 2's UI has landed.** The web and mobile clients were rebuilt around a shared design system, and the catalog is now browsable and searchable end to end — Discover, Search, set detail and card detail all read live data. See [`docs/design-system.md`](docs/design-system.md) for the visual system and the per-screen specification.

**Phase 3, the scanner, has landed.** Point the camera at a card on web or mobile and CardScan recognises it against the imported catalog, locally and in TypeScript — see [`docs/recognition.md`](docs/recognition.md). Build the index once with `pnpm recognition:index`.

Collection, wishlist, decks, and pricing are not implemented yet — see [Roadmap](#roadmap). The UI marks each of those honestly rather than faking it: no placeholder numbers, and every unbuilt feature points at a path that does work.

## Tech stack

| Layer      | Stack                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Web        | Next.js (App Router), React, TypeScript, Tailwind CSS, DaisyUI, TanStack Query |
| Design     | Shared tokens in `packages/config` — see [`docs/design-system.md`](docs/design-system.md) |
| Mobile     | Expo (React Native), TypeScript, Expo Router                          |
| API        | Node.js, Express, TypeScript, JWT auth, Zod validation                 |
| Database   | PostgreSQL via Prisma ORM                                              |
| Cache      | Redis (provisioned, not yet wired into application logic)              |

## Architecture

```
cardscan/
├── apps/
│   ├── web/       Next.js app
│   ├── mobile/    Expo app
│   └── api/       Express API
├── packages/
│   ├── types/       Shared TypeScript types
│   ├── validation/  Shared Zod schemas
│   └── config/      Shared constants (enums, feature flags, theme tokens)
├── prisma/
│   └── schema.prisma  Full core database schema
├── docker/
│   └── docker-compose.yml  Postgres + Redis for local dev
└── docs/
```

Web, mobile, and the API all share types and validation schemas from `packages/`, so request/response shapes never drift between clients. See [`docs/architecture.md`](docs/architecture.md) and [`docs/database.md`](docs/database.md) for more detail.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- Docker Desktop (for local Postgres + Redis) — or a local Postgres instance if you prefer
- Expo Go app or an iOS/Android simulator, to run the mobile app on a device

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start Postgres + Redis
pnpm docker:up

# 4. Generate the Prisma client and run migrations
pnpm prisma:generate
pnpm prisma:migrate

# 5. Import the card catalogs (sets + cards + images)
pnpm sync:pokemon   # from TCGdex — ~20s
pnpm sync:magic     # from Scryfall — downloads a ~78MB bulk file, a few minutes
pnpm sync:yugioh    # from YGOPRODeck — downloads and re-hosts ~14.5k card images, ~5 minutes
pnpm sync:others    # Lorcana, One Piece, Digimon, Star Wars: Unlimited, Flesh and Blood — ~3 minutes
                    # (or each on its own: sync:lorcana | sync:onepiece | sync:digimon | sync:starwars | sync:fab)
                    # `pnpm sync:all` runs all eight games

# 6. Run the apps (in separate terminals)
pnpm dev:api      # http://localhost:4100
pnpm dev:web      # http://localhost:3001
pnpm dev:mobile   # opens Expo dev tools
```

### Environment variables

See [`.env.example`](.env.example) for the full list. The variables actually used in Phase 1 are `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL`, `POKEMON_API_URL`, and `MAGIC_API_URL`. Everything else is reserved for later phases (object storage, price providers) and isn't read by any code yet.

### Database

The Prisma schema at [`prisma/schema.prisma`](prisma/schema.prisma) defines the full data model (users, TCGs, sets, cards, collections, wishlists, scans, decks, prices) so later phases won't require destructive migrations. Auth/user tables and both card catalogs (Pokémon via TCGdex, Magic via Scryfall — see below) are wired into the API so far.

```bash
pnpm prisma:migrate   # apply migrations locally
pnpm prisma:studio    # browse the database
pnpm sync:pokemon     # (re-)import the Pokémon catalog from TCGdex — see docs/database.md
pnpm sync:magic       # (re-)import the Magic catalog from Scryfall — see docs/database.md
```

### Testing the auth flow end-to-end

With the API running:

```bash
curl -X POST http://localhost:4100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"you","password":"Password1"}'
```

Or just open http://localhost:3001, register an account, and you'll land on the three welcome screens and then Home.

> The auth rate limiter allows 20 requests per 15 minutes per IP across `/auth/*`, and `/auth/refresh` counts — a hard page reload spends one. That's ample in normal use but easy to trip while developing.

## Docker

```bash
pnpm docker:up     # start Postgres + Redis
pnpm docker:down   # stop them
```

## Scripts

| Command              | Description                                  |
| --------------------- | --------------------------------------------- |
| `pnpm dev:api`         | Run the Express API in watch mode             |
| `pnpm dev:web`         | Run the Next.js dev server                    |
| `pnpm dev:mobile`      | Start the Expo dev server                     |
| `pnpm build`           | Build all packages and apps                   |
| `pnpm typecheck`       | Type-check every workspace                    |
| `pnpm prisma:generate` | Regenerate the Prisma client                  |
| `pnpm prisma:migrate`  | Run Prisma migrations locally                 |
| `pnpm prisma:studio`   | Open Prisma Studio                            |
| `pnpm sync:pokemon`    | Import the Pokémon catalog (sets, cards, images) from TCGdex |
| `pnpm sync:magic`      | Import the Magic catalog (sets, cards, images) from Scryfall |
| `pnpm sync:yugioh`     | Import the Yu-Gi-Oh! catalog from YGOPRODeck and re-host its images |
| `pnpm sync:others`     | Import Lorcana, One Piece, Digimon, Star Wars: Unlimited and Flesh and Blood (see docs/database.md) |
| `pnpm sync:all`        | Import all eight games |
| `pnpm recognition:index` | Build the card recognition index from the imported catalog (resumable) — see [docs/recognition.md](docs/recognition.md) |
| `pnpm recognition:eval`  | Measure recognition accuracy on simulated phone photos |
| `pnpm test`            | Run validation, API (real Postgres) and web tests — see [docs/testing.md](docs/testing.md) |
| `pnpm test:e2e`        | Run the Playwright browser tests (cards + images loading end-to-end) |
| `pnpm test:e2e:mobile` | Run the mobile app (Expo web build) in a browser against the real API |

## Roadmap

Built in phases — see [`docs/architecture.md`](docs/architecture.md) for details:

1. **Foundation** — monorepo, auth, DB schema, web/mobile shell
2. **Card database** — Pokémon ([TCGdex](https://tcgdex.dev), `pnpm sync:pokemon`), Magic ([Scryfall](https://scryfall.com/docs/api), `pnpm sync:magic`) and Yu-Gi-Oh! ([YGOPRODeck](https://ygoprodeck.com/api-guide/), `pnpm sync:yugioh`) catalogs are imported, with read endpoints (`/api/tcgs`, `/api/sets`, `/api/cards`) and a full browse/search UI on web and mobile
3. **Scanner** — camera capture on web and mobile, a local recognition pipeline (card detection, visual matching, confidence), scan history and correction feedback (`pnpm recognition:index`)
4. **Collection** — add/remove cards, quantities, conditions, statistics
5. **Wishlist**
6. **Pricing** — price providers, history, collection valuation
7. **Decks**
8. **Polish** — animations, accessibility, performance, PWA

## License

Private project — not licensed for redistribution.
