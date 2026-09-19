# CardScan

**Scan. Identify. Collect.**

CardScan is a cross-platform TCG card recognition and collection management platform, starting with Pokémon and Magic: The Gathering. This repository is a pnpm monorepo containing the API, web app, mobile app, and shared packages.

> Pokémon and Magic: The Gathering are trademarks of their respective owners. CardScan is not affiliated with or endorsed by these companies.

## Status

**Phase 1 — Foundation** is done: monorepo scaffolding, authentication (register/login/refresh/logout/forgot-password/reset-password), the full core database schema, and a navigable web + mobile shell.

**Phase 2 — Card database** has started: the full Pokémon catalog (220 sets, ~23.7k cards, ~92% with card images) is imported from [TCGdex](https://tcgdex.dev) via `pnpm sync:pokemon`, and the full Magic: The Gathering catalog (1,051 sets, ~109k paper cards, >99% with images) from [Scryfall](https://scryfall.com/docs/api) via `pnpm sync:magic` — both queryable through read-only `/api/tcgs`, `/api/sets`, `/api/cards` endpoints. The card database search UI isn't built yet.

Scanning/recognition, collection, wishlist, decks, and pricing are not implemented yet — see [Roadmap](#roadmap).

## Tech stack

| Layer      | Stack                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Web        | Next.js (App Router), React, TypeScript, Tailwind CSS, DaisyUI, TanStack Query |
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

# 6. Run the apps (in separate terminals)
pnpm dev:api      # http://localhost:4100
pnpm dev:web      # http://localhost:3000
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

Or just open http://localhost:3000, register an account, and you'll land on the dashboard shell.

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

## Roadmap

Built in phases — see [`docs/architecture.md`](docs/architecture.md) for details:

1. **Foundation** — monorepo, auth, DB schema, web/mobile shell
2. **Card database** (in progress) — Pokémon ([TCGdex](https://tcgdex.dev), `pnpm sync:pokemon`) and Magic ([Scryfall](https://scryfall.com/docs/api), `pnpm sync:magic`) catalogs are imported, with read endpoints (`/api/tcgs`, `/api/sets`, `/api/cards`); card database search UI not started yet
3. **Scanner** — camera capture, recognition pipeline, confidence scoring
4. **Collection** — add/remove cards, quantities, conditions, statistics
5. **Wishlist**
6. **Pricing** — price providers, history, collection valuation
7. **Decks**
8. **Polish** — animations, accessibility, performance, PWA

## License

Private project — not licensed for redistribution.
