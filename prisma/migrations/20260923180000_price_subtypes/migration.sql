-- DropIndex
DROP INDEX "prices_cardId_source_key";

-- AlterTable
ALTER TABLE "price_history" ADD COLUMN     "subType" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "prices" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "market" DECIMAL(10,2),
ADD COLUMN     "subType" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "prices_cardId_source_subType_key" ON "prices"("cardId", "source", "subType");
