import { normalizeNumber, type CardRules, type FinishFilter } from "./match";

/**
 * Where a game's catalog is shaped differently from TCGplayer's. Each rule
 * says which of a TCGplayer product's finishes belong to which of our cards.
 */

/**
 * One Piece parallel arts and reprints are separate cards here ("OP01-077_p1",
 * "ST03-008_r2"); TCGplayer keeps the base number and tells them apart by name
 * ("(Parallel)", "(Reprint)") or by the group they're sold in.
 */
export const onePieceRules: CardRules = {
  numberKey: (collectorNumber) => normalizeNumber(collectorNumber.replace(/_[pr]\d+$/i, "")),
};

/**
 * Older SWU sets: SWU-DB lists each foil as its own card with an `F` number
 * ("104F") while TCGplayer prices the foil as a finish of the same product, so
 * the F card takes the product's foil finishes and the plain card the rest.
 * Newer sets give the foil its own number on both sides ("Heroic ARC-170 (Foil)"
 * #764) — that product is wholly the card's.
 */
export const starWarsRules: CardRules = {
  numberKey: (collectorNumber) => normalizeNumber(collectorNumber.replace(/F$/i, "")),
  finishes: (card, product) => {
    const foilCard = /F$/i.test(card.collectorNumber);
    if (!foilCard && /\bfoil\b/i.test(product.name)) return () => true;
    return (subType) => subType.toLowerCase().includes("foil") === foilCard;
  },
};

const FAB_EDITIONS: Record<string, FinishFilter> = {
  F: (s) => s.includes("1st"),
  U: (s) => s.includes("unlimited"),
  // Welcome to Rathe's Alpha print is its first edition, and TCGplayer names it so.
  A: (s) => s.includes("alpha") || s.includes("1st"),
  N: (s) => !/1st|unlimited|alpha/.test(s),
};

const FAB_FOILINGS: Record<string, FinishFilter> = {
  S: (s) => !s.includes("foil"),
  R: (s) => s.includes("rainbow"),
  C: (s) => s.includes("cold") && !s.includes("gold"),
  G: (s) => s.includes("gold"),
};

/** fab-cube art-variation codes → how TCGplayer names that printing's product. */
const FAB_ARTS: Record<string, RegExp> = {
  EA: /extended art/i,
  FA: /full art/i,
  AA: /alternate art|alt art/i,
  AB: /alternate border/i,
  AT: /alternate text/i,
};

/**
 * fab-cube stores one card per `edition-foiling[-art…]` ("F-R", "U-S", "N-C-EA").
 * TCGplayer sells each card (and each art variation) as one product whose
 * finishes are "1st Edition Rainbow Foil", "Unlimited Edition Normal", "Cold Foil" …
 * so each of our rows takes the finish its edition + foiling name.
 */
export const fleshAndBloodRules: CardRules = {
  finishes: (card, product, { lenient }) => {
    const [edition = "", foiling, ...arts] = (card.variant ?? "").split("~")[0]!.split("-");
    // Promos are printed with no edition ("N") but TCGplayer may still list one.
    const editionOk = lenient && edition === "N" ? () => true : FAB_EDITIONS[edition];
    if (!editionOk) return null;
    const foilingOk = foiling ? FAB_FOILINGS[foiling] : () => true;
    if (!foilingOk) return null;

    // Art variations are separate products: a row only takes the product whose
    // name carries exactly its art variations. Promo products usually don't say,
    // so the lenient pass lets a still-unpriced row take its number's product.
    if (!lenient) {
      if (arts.some((art) => !FAB_ARTS[art])) return null;
      for (const [art, pattern] of Object.entries(FAB_ARTS)) {
        if (arts.includes(art) !== pattern.test(product.name)) return null;
      }
    }

    return (subType) => {
      const s = subType.toLowerCase();
      return editionOk(s) && foilingOk(s);
    };
  },
};

/**
 * Scryfall gives the foil-only printings of 7th–9th Edition their own card with
 * a ★ number ("39★"); TCGplayer sells them as the Foil finish of the card's product.
 */
export const magicRules: CardRules = {
  numberKey: (collectorNumber) => normalizeNumber(collectorNumber.replace(/★$/, "")),
  finishes: (card) =>
    card.collectorNumber.endsWith("★") ? (subType) => subType.toLowerCase().includes("foil") : () => true,
};
