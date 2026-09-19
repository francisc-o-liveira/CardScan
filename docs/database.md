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

## Why only User/Auth tables are used right now

Phase 1 implements the full schema up front (so later phases don't need destructive migrations) but only wires `User`, `RefreshToken`, and `PasswordResetToken` into the API. The rest of the tables exist with correct foreign keys and constraints, ready for Phase 2+.

## Migrations

```bash
pnpm prisma:migrate    # create + apply a migration locally
pnpm prisma:studio     # inspect data
```
