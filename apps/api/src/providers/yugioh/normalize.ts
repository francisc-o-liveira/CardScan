import type { YgoCard } from "./ygoprodeck.types";

/** Cards that YGOPRODeck lists without any set printing are grouped under this pseudo-set. */
export const NO_SET = { code: "no-set", name: "No set (unreleased / promo / token)" } as const;

/**
 * YGOPRODeck set *codes* are not unique (e.g. "YS15" is shared by three different starter decks),
 * but set names are — so the set name, slugified, is our stable `CardSet.code`.
 */
export const slugifySetName = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface YgoPrinting {
  setCode: string;
  setName: string;
  collectorNumber: string;
  variant: string;
  rarity: string | null;
  name: string;
  /** Source image URL on YGOPRODeck (to be downloaded and re-hosted, never hotlinked). */
  sourceImageUrl: string | null;
  cardId: number;
}

/** A card exists once in YGOPRODeck but is printed many times — we store one row per printing. */
export const toPrintings = (card: YgoCard): YgoPrinting[] => {
  const image = card.card_images?.[0];
  const base = {
    name: card.name,
    sourceImageUrl: image?.image_url ?? null,
    cardId: card.id,
  };

  if (!card.card_sets || card.card_sets.length === 0) {
    return [
      {
        ...base,
        setCode: NO_SET.code,
        setName: NO_SET.name,
        collectorNumber: String(card.id),
        variant: "",
        rarity: null,
      },
    ];
  }

  return card.card_sets.map((printing) => ({
    ...base,
    setCode: slugifySetName(printing.set_name),
    setName: printing.set_name,
    collectorNumber: printing.set_code,
    // The same print code can exist in several rarities within one set, so rarity is part of identity.
    variant: printing.set_rarity ?? "",
    rarity: printing.set_rarity ?? null,
  }));
};
