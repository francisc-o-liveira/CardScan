import type { CatalogCard } from "@cardscan/types";

export const makeCard = (overrides: Partial<CatalogCard> = {}): CatalogCard => ({
  id: "card-1",
  tcgId: "tcg-1",
  setId: "set-1",
  name: "Charizard",
  collectorNumber: "4",
  rarity: "Rare Holo",
  variant: "",
  imageUrl: "https://img.test/charizard.webp",
  marketPrice: null,
  set: {
    id: "set-1",
    tcgId: "tcg-1",
    code: "base1",
    name: "Base Set",
    releaseDate: "1999-01-09",
    totalCards: 102,
    symbolUrl: null,
  },
  tcg: { id: "tcg-1", slug: "pokemon", name: "Pokémon", isEnabled: true },
  ...overrides,
});

export const cardsPage = (cards: CatalogCard[], pagination: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {}) => ({
  data: cards,
  pagination: { page: 1, limit: 24, total: cards.length, totalPages: 1, ...pagination },
});
