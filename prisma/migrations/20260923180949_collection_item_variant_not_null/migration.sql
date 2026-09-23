-- collection_items.variant was nullable, so its unique key (collectionId, cardId, condition, language,
-- variant) never applied to rows without a variant: Postgres treats NULLs as distinct. Make it
-- non-null with '' as "no variant" (as cards already do), so the key blocks duplicate copy groups.

-- 1. Merge copy groups that were split into several rows while that was possible: the oldest row of
--    each group keeps the summed quantity, the rest are removed.
WITH ranked AS (
  SELECT id,
         SUM(quantity) OVER grp AS total,
         ROW_NUMBER() OVER (PARTITION BY "collectionId", "cardId", condition, language, COALESCE(variant, '')
                            ORDER BY "createdAt", id) AS position
  FROM "collection_items"
  WINDOW grp AS (PARTITION BY "collectionId", "cardId", condition, language, COALESCE(variant, ''))
)
UPDATE "collection_items" AS item
SET quantity = ranked.total
FROM ranked
WHERE item.id = ranked.id AND ranked.position = 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "collectionId", "cardId", condition, language, COALESCE(variant, '')
                            ORDER BY "createdAt", id) AS position
  FROM "collection_items"
)
DELETE FROM "collection_items" AS item
USING ranked
WHERE item.id = ranked.id AND ranked.position > 1;

-- 2. No variant is now '' rather than NULL.
UPDATE "collection_items" SET variant = '' WHERE variant IS NULL;

-- 3. Enforce it.
ALTER TABLE "collection_items" ALTER COLUMN "variant" SET NOT NULL,
ALTER COLUMN "variant" SET DEFAULT '';
