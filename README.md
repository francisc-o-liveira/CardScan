# CardScan

**Scan. Identify. Collect.**

CardScan is a cross-platform TCG card recognition and collection management platform, starting with Pokémon and Magic: The Gathering. This repository is a pnpm monorepo containing the API, web app, mobile app, and shared packages.

> Pokémon and Magic: The Gathering are trademarks of their respective owners. CardScan is not affiliated with or endorsed by these companies.

## Status

This is **Phase 1 — Foundation**: monorepo scaffolding, authentication (register/login/refresh/logout/forgot-password/reset-password), the full core database schema, and a navigable web + mobile shell. Card database, scanning/recognition, collection, wishlist, decks, and pricing are not implemented yet — see [Roadmap](#roadmap).

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

# 5. Run the apps (in separate terminals)
pnpm dev:api      # http://localhost:4100
pnpm dev:web      # http://localhost:3000
pnpm dev:mobile   # opens Expo dev tools
```

### Environment variables

See [`.env.example`](.env.example) for the full list. The variables actually used in Phase 1 are `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `EXPO_PUBLIC_API_URL`. Everything else is reserved for later phases (object storage, recognition providers, price providers) and isn't read by any code yet.

### Database

The Prisma schema at [`prisma/schema.prisma`](prisma/schema.prisma) defines the full data model (users, TCGs, sets, cards, collections, wishlists, scans, decks, prices) so later phases won't require destructive migrations. Only the auth/user tables are wired into the API so far.

```bash
pnpm prisma:migrate   # apply migrations locally
pnpm prisma:studio    # browse the database
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

## Roadmap

Built in phases — see [`docs/architecture.md`](docs/architecture.md) for details:

1. **Foundation** (this pass) — monorepo, auth, DB schema, web/mobile shell
2. **Card database** — TCG/Set/Card models, Pokémon & Magic providers, search
3. **Scanner** — camera capture, recognition pipeline, confidence scoring
4. **Collection** — add/remove cards, quantities, conditions, statistics
5. **Wishlist**
6. **Pricing** — price providers, history, collection valuation
7. **Decks**
8. **Polish** — animations, accessibility, performance, PWA

## License

Private project — not licensed for redistribution.
