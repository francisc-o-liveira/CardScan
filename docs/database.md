# Database

PostgreSQL via Prisma. Schema: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Entities

- **User** — auth identity. Has one `Collection`, one `Wishlist`, many `RefreshToken`s, `Scan`s, `Deck`s.
- **Tcg / CardSet / Card / CardVariant** — the card catalog. `Card` is unique on `(tcgId, setId, collectorNumber, variant)`.
- **Collection / CollectionItem** — one `Collection` per user; `CollectionItem` is unique on `(collectionId, cardId, condition, language, variant)` so owning the same card in different conditions/languages creates separate rows, but re-adding an identical one updates quantity instead of inserting a duplicate.
- **Wishlist / WishlistItem**
- **Scan / RecognitionFeedback** — `RecognitionFeedback` records user corrections to a scan's predicted card, building a dataset for future recognition improvements.
- **Deck / DeckItem**
- **Price / PriceHistory** — `Price` is the latest snapshot per `(cardId, source)`; `PriceHistory` is an append-only time series.

All primary keys are UUIDs. Money fields use `Decimal(10,2)`, never `Float`.

## Why only User/Auth/Catalog tables are used right now

Phase 1 implements the full schema up front (so later phases don't need destructive migrations) but only wires `User`, `RefreshToken`, `PasswordResetToken`, `Tcg`, `CardSet`, and `Card` into the API so far. `CollectionItem`, `WishlistItem`, `Scan`, `Deck`, `Price`, and `PriceHistory` exist with correct foreign keys and constraints, ready for their respective phases.

## Pokémon catalog sync

```bash
pnpm sync:pokemon
```

Pulls the full Pokémon set/card catalog from [TCGdex](https://tcgdex.dev) (`POKEMON_API_URL`, default `https://api.tcgdex.net/v2/en`) and upserts it into `Tcg`/`CardSet`/`Card`. Implementation: `apps/api/src/providers/pokemon/` (raw TCGdex client + types) and `apps/api/src/services/pokemonSyncService.ts` (normalization + upsert).

Notes:
- One TCGdex request per set (`GET /sets/:id`) already returns every card in that set, so a full sync is ~220 requests, not one per card (~24k) — it currently completes in well under a minute with 8-way concurrency.
- `Card.imageUrl` is stored as the fully-resolved, ready-to-use TCGdex CDN URL (`.../{localId}/high.webp`) — no object storage or download step, since TCGdex explicitly serves these images for hotlinking. Not every card has one (~7% don't, mostly energy cards and older promos where TCGdex itself has no artwork).
- `Card.variant` is written as `""` rather than `null` for these rows. Postgres never treats two `NULL`s as equal in a unique index, so upserting against the compound unique key `(tcgId, setId, collectorNumber, variant)` with `variant: null` would insert a fresh duplicate every re-run instead of matching the existing row — `""` keeps the sync idempotent. Re-running `pnpm sync:pokemon` updates existing rows in place.
- Per-card detail (rarity, HP, types, attacks, language variants) isn't fetched — the per-set endpoint only gives `id`/`localId`/`name`/`image`. Fetching full detail would mean ~24k additional requests; not done here since it wasn't needed for images.
- Sets from TCGdex's `tcgp` series (**Pokémon TCG Pocket**, a digital-only game) are skipped — they can never be physically scanned, and some of their image URLs 404 (the browser E2E test caught this). That leaves 205 sets and ~21.3k cards. TCGdex is Pokémon-only — see below for Magic.

## Magic: The Gathering catalog sync

```bash
pnpm sync:magic
```

Pulls the full Magic set/card catalog from [Scryfall](https://scryfall.com/docs/api) (`MAGIC_API_URL`, default `https://api.scryfall.com`) and upserts it into `Tcg`/`CardSet`/`Card`. Implementation: `apps/api/src/providers/magic/` (Scryfall client + types) and `apps/api/src/services/magicSyncService.ts` (normalization + upsert).

Notes:
- Scryfall's own guidance for full catalog syncs is to use its **bulk data** files rather than paginate `/cards/search` — we fetch `GET /sets` (1,051 sets, one request) plus the `default_cards` bulk file (`GET /bulk-data` → `jsonl_download_uri`), which is a gzip-compressed **JSONL** file (one JSON card object per line, not a JSON array) containing one entry per English (or sole-language) print — ~118k cards, ~78MB compressed / ~630MB decompressed. We stream-download, gunzip, and parse it line-by-line (`zlib.createGunzip()` piped into `readline`) rather than loading it into memory, and upsert in batches of 200.
- `Card.imageUrl` uses Scryfall's `large` image (or the first face's, for double-faced/transform/art-series cards, which have no top-level `image_uris`) — see `apps/api/src/providers/magic/image.ts`.
- `Card.rarity` is populated directly from Scryfall's `rarity` field — unlike the Pokémon sync, this comes for free from the bulk file with no extra requests.
- Cards with `digital: true` (Arena/MTGO-only objects, e.g. Alchemy rebalances) are skipped — they can never be physically scanned or collected, which is what CardScan's catalog is for.
- Same `variant: ""` idempotency sentinel as the Pokémon sync, for the same reason (see above). `default_cards` has exactly one entry per `(set, collector_number)`, so this is safe.
- Card language isn't tracked (same simplification as Pokémon) — `default_cards` is "English, or the only language it was printed in," so a handful of foreign-only promos will show their native name.

## Yu-Gi-Oh! catalog sync

```bash
pnpm sync:yugioh                    # full sync; downloads any missing card images (~5 min the first time)
pnpm sync:yugioh -- --skip-images   # data only; images already on disk are still linked
```

Pulls the catalog from [YGOPRODeck](https://ygoprodeck.com/api-guide/) (`YUGIOH_API_URL`, default `https://db.ygoprodeck.com/api/v7`). Implementation: `apps/api/src/providers/yugioh/` (client, types, pure `normalize.ts`), `apps/api/src/storage/imageStorage.ts` and `apps/api/src/services/yugiohSyncService.ts`.

Notes:
- **Images are downloaded and re-hosted, not hotlinked.** YGOPRODeck's guide says hotlinking gets your IP blacklisted, so each card image is downloaded once (6 at a time; files already on disk are skipped, so re-runs are cheap and an interrupted run resumes) into `apps/api/storage/yugioh/cards/{id}.jpg` and served by the API at `/assets/...`. `Card.imageUrl` is the resulting `API_PUBLIC_URL`-based URL. `storage/` is git-ignored and rebuilt by the sync. `ImageStorage` is an interface, so an S3/R2/MinIO driver can replace the local-disk one later. If `API_PUBLIC_URL` changes, re-run the sync to rewrite the URLs.
- The API is rate-limited to 20 requests/second (1-hour ban if exceeded), so the sync makes exactly **two** API calls: `cardinfo.php` (all ~14.5k cards) and `cardsets.php` (all sets).
- One YGOPRODeck card is printed many times, so **a row is one printing**: `collectorNumber` is the print code (e.g. `LOB-EN001`), `variant` and `rarity` are the printing's rarity (the same print code can exist in several rarities in one set). That is ~45k printings for ~14.5k cards; all printings of a card share one image (its default artwork).
- `CardSet.code` is the **slugified set name**, because YGOPRODeck set codes are not unique (e.g. `YS15` is three different starter decks). Cards with no set printing (tokens, skills, unreleased) go into a `no-set` pseudo-set.
- Set images (`set_image`) are not used, for the same hotlinking reason, so `symbolUrl` is null for Yu-Gi-Oh! sets.
- Nine (set, print code, rarity) combinations appear twice in the source data; the later entry wins.

## Migrations

```bash
pnpm prisma:migrate    # create + apply a migration locally
pnpm prisma:studio     # inspect data
```
