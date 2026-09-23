# Database

PostgreSQL via Prisma. Schema: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Entities

- **User** — auth identity. Has one `Collection`, one `Wishlist`, many `RefreshToken`s, `Scan`s, `Deck`s.
- **Tcg / CardSet / Card / CardVariant** — the card catalog. `Card` is unique on `(tcgId, setId, collectorNumber, variant)`.
- **Collection / CollectionItem** — one `Collection` per user; `CollectionItem` is unique on `(collectionId, cardId, condition, language, variant)` so owning the same card in different conditions/languages creates separate rows, but re-adding an identical one updates quantity instead of inserting a duplicate.
- **Wishlist / WishlistItem**
- **Scan / RecognitionFeedback** — `RecognitionFeedback` records user corrections to a scan's predicted card, building a dataset for future recognition improvements.
- **Deck / DeckItem**
- **Price / PriceHistory** — `Price` is the latest snapshot per `(cardId, source, subType)` — `subType` is the finish ("Holofoil", "Reverse Holofoil", "1st Edition" …); `PriceHistory` is an append-only time series with one point per card, finish and day.

All primary keys are UUIDs. Money fields use `Decimal(10,2)`, never `Float`.

## Why only User/Auth/Catalog tables are used right now

Phase 1 implements the full schema up front (so later phases don't need destructive migrations) but only wires `User`, `RefreshToken`, `PasswordResetToken`, `Tcg`, `CardSet`, `Card`, `Price` and `PriceHistory` into the API so far. `CollectionItem`, `WishlistItem`, `Scan`, and `Deck` exist with correct foreign keys and constraints, ready for their respective phases.

## TCGplayer prices

`pnpm sync:prices [game|all] [--verbose]` (`apps/api/src/services/priceSyncService.ts`) reads TCGplayer's prices from [tcgcsv.com](https://tcgcsv.com), which republishes TCGplayer's catalog and price API as static JSON once a day (no key; override the base with `TCGPLAYER_PRICES_URL`). Per game it fetches TCGplayer's groups (sets), each group's products and prices, and matches them onto our catalog:

- **Magic** matches exactly: Scryfall's bulk file carries each printing's TCGplayer `productId`.
- **Every other game** matches a group to a set by code (where TCGplayer's abbreviations equal ours), by name with series prefixes read off (`SV03: Obsidian Flames`, `SM - Cosmic Eclipse`, `EX Emerald`, `XY Base Set` → `XY`), or through a small alias table for sets named too differently (`POKEMON_ALIASES`). A product then matches a card by collector number **only when the names agree too** (TCGplayer keeps a reprint's original number — the 30th Celebration Classic Collection's `Delcatty 5/109` — where we renumber), falling back to a name unique within the set. Anything ambiguous stays unpriced rather than guessed.
- A card gets one row per finish; the API's `marketPrice` is the main finish's market price (reverse holos and Magic foils rank last). Each run replaces the game's prices in one transaction and rewrites the day's history point.
- `--verbose` lists TCGplayer groups that matched no set and every match whose names differ, for review.

**History.** `GET /api/cards/:id/price-history?range=1m|3m|6m|1y` returns each finish's daily market-price points in the range, with the change over the range and its low/high; the card page draws it as a chart next to the current price points. The history is our own — one point per card, finish and day, written by each sync — so it only exists from the first sync (2026-09-23) onward and only grows if the sync runs daily. There is no public source for older TCGplayer history: tcgcsv's daily price archive (from 2024-02-08) has been taken offline, and TCGplayer's own chart/sales-volume API is internal. Sales volume, listing quantity and seller counts aren't available at all.

tcgcsv refreshes once a day and asks that each price file be requested at most once per 24 hours — run the sync daily, not more.

Per-game differences live in `apps/api/src/providers/tcgplayer/gameRules.ts` and the `PRICE_GAMES` config:

- **Game-wide numbers** (Yu-Gi-Oh!, Digimon, One Piece, Flesh and Blood): collector numbers are unique across the game, so products match against every card, not one set — TCGplayer's groups don't line up with our sets there (Digimon's "Release Special Booster 1.0" holds BT1–BT3). The group's set, when it has one, only breaks ties between a card and its reprint (One Piece `_r1`).
- **One product, several of our cards**: Flesh and Blood keeps a row per `edition-foiling[-art]` and Star Wars a separate `F` card per foil, where TCGplayer sells one product priced per finish. Each of our rows takes only its finish ("1st Edition Rainbow Foil", "Foil"); Magic's ★ printings (7th–9th Edition foils) likewise take their card's Foil price. A second, lenient pass lets Flesh and Blood promo rows ignore art/edition labels TCGplayer doesn't print.
- **Tie-breaks on a shared number**: exact name ("Kaido & Linlin (Parallel)"), then rarity — Yu-Gi-Oh! prints one number in several rarities, and TCGplayer's "Prismatic Ultimate Rare" is our "Ultimate Rare".
- **Groups spanning sets**: Lorcana's single "Disney Lorcana Promo Cards" group covers our P1–P4 and event promo sets (`groupSets`); Star Wars promo lines are aliased by name.
- Responses are cached for 20 hours in `apps/api/storage/tcgcsv-cache` (`TCGPLAYER_CACHE_DIR`), so re-running a sync never re-downloads.

Coverage on 2026-09-23: Lorcana 98.3% of cards, Digimon 97.7%, One Piece 96.7%, Pokémon 96.6%, Flesh and Blood 94.5%, Yu-Gi-Oh! 93.9%, Magic 90.9%, Star Wars 81.3%. What's left is mostly printings TCGplayer doesn't sell: Pokémon trainer kits (both decks as one group with repeating numbers), Magic's Salvat/Foreign Black Border/Art Series sets, Yu-Gi-Oh!'s set-less cards and European-only prints, and Star Wars' yearly promo sets.

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

## The other five games (Lorcana, One Piece, Digimon, Star Wars: Unlimited, Flesh and Blood)

```bash
pnpm sync:lorcana     # Disney Lorcana        — Lorcast API
pnpm sync:onepiece    # One Piece             — OPTCG API (re-hosts images, ~2 min the first time)
pnpm sync:digimon     # Digimon               — digimoncard.io
pnpm sync:starwars    # Star Wars: Unlimited  — SWU-DB
pnpm sync:fab         # Flesh and Blood       — the-fab-cube open dataset
pnpm sync:others      # all five
pnpm sync:all         # all eight games
```

These share one sync core instead of five copies: a game is a small adapter (`apps/api/src/providers/<game>/provider.ts`) that turns its source into `{ sets, cards }`, and `apps/api/src/services/catalogSyncService.ts` does the rest (upserts, duplicate handling, image policy, reporting). Adding a sixth game means writing one adapter and registering it in `providers/registry.ts`. All sources are free and need no API key; every request carries a descriptive `User-Agent` and transient failures (429/5xx/network) are retried with backoff.

| Game | Source | Requests | Cards | Images |
| ---- | ------ | -------- | ----- | ------ |
| Disney Lorcana | [Lorcast](https://lorcast.com/docs/api) | 1 + one per set (24), spaced ~120ms | ~3.2k | Lorcast CDN, **hotlinked** (AVIF only) |
| One Piece | [OPTCG API](https://optcgapi.com) | 2 (boosters + starter decks) | ~4.2k artworks | **re-hosted** in `/assets/onepiece/…` (small hobby-run site) |
| Digimon | [digimoncard.io](https://digimoncard.io/api) | 1 | ~4.5k | digimoncard.io image host, hotlinked |
| Star Wars: Unlimited | [SWU-DB](https://www.swu-db.com/api) | 1 + one per set (~54), spaced 150ms | ~9.9k (incl. foil/hyperspace/showcase numbers) | SWU-DB CDN, hotlinked |
| Flesh and Blood | [fab-cube dataset](https://github.com/the-fab-cube/flesh-and-blood-cards) (GitHub) | 2 static JSON files (~23MB) | ~16.7k printings | Official Legend Story Studios CDN, hotlinked |

Notes:
- **Image policy** is per source (`imagePolicy: "hotlink" | "rehost"`). Official/CDN-backed sources are hotlinked; the hobby-run OPTCG site is downloaded once and served from our own `/assets`, exactly like Yu-Gi-Oh!. None of the five documents a hotlinking ban (unlike YGOPRODeck), but if one ever does, flip that provider to `rehost` and re-run its sync.
- **Row identity** is `(set, collectorNumber, variant)`; `variant` is `""` when there is none. Where a source repeats a collector number, the adapter makes the variant distinguish them: Flesh and Blood uses `edition-foiling-art` (plus part of the printing's unique id for the ~150 genuinely identical combinations); One Piece uses the *artwork id* (`OP01-077_p1`) as the number, so parallel arts are separate cards. Rows a source lists twice are merged (the later wins) and reported.
- **Names:** Lorcana is `Name - Version`, Star Wars is `Name - Subtitle`, and Flesh and Blood appends the pitch colour (`Wounded Bull (Red)`), because those cards are otherwise indistinguishable in a grid.
- **Set codes:** Lorcast/SWU-DB/OPTCG/fab-cube set codes are used as-is. Digimon card numbers only carry a code (`BT3`), so its readable name (`BT-03: Booster Union Impact`) is matched from each card's `set_name` list; promos are `P` ("Promotional cards").
- **Not imported:** digital-only/online cards aren't in these sources; card text, stats and prices are available in most of them but aren't stored (the schema only holds what a card grid needs).
- **Star Wars foil images:** SWU-DB lists foil versions with an `F` number (`059F`) and points them at `…/059F.png`, which the CDN answers with 403 — about half of all Star Wars cards. A foil is the same artwork as its non-foil, so the adapter rewrites those URLs to `…/059.png` (`swuImageUrl`). Roughly 1% of Star Wars cards (mostly tournament promo sets such as `TWIPQ`/`TSHD`) have no image on the CDN at all; the apps show the placeholder for them.
- **Verified against the live sources:** a random sample of 300 image URLs per game was requested from each CDN — Lorcana, Digimon, Flesh and Blood, Pokémon and Magic were 300/300, Star Wars 99%; every re-hosted One Piece and Yu-Gi-Oh! file exists on disk.
- **AVIF:** Lorcast serves card images only as AVIF. Every current browser and Android 12+/iOS 16+ render it; older phones won't show Lorcana art (the placeholder appears instead).
- The Flesh and Blood dataset is a community project tracking the `develop` branch (unlicensed repository — verify the terms before any commercial use); point `FAB_DATA_URL` at a pinned commit to freeze it.

## Migrations

```bash
pnpm prisma:migrate    # create + apply a migration locally
pnpm prisma:studio     # inspect data
```
