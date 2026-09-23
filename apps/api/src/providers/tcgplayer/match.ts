import type { TcgcsvGroup, TcgcsvProduct } from "./tcgcsv.types";

/**
 * Matching TCGplayer's catalog onto ours.
 *
 * TCGplayer has its own ids, so a group (set) is matched to one of our sets by
 * code or name, and a product to one of that set's cards by collector number,
 * falling back to a name that is unique within the set. Anything ambiguous is
 * left unmatched rather than guessed — a wrong price is worse than none.
 */

export interface MatchableSet {
  id: string;
  code: string;
  name: string;
}

export interface MatchableCard {
  id: string;
  name: string;
  collectorNumber: string;
  rarity?: string | null;
  variant?: string | null;
  setId?: string;
}

/** Lowercase, accent-free, alphanumerics only: "Scarlet & Violet—151" → "scarletandviolet151". */
export const normalizeName = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

/**
 * "021/128" → "21", "TG01/TG30" → "tg1", "LOB-EN001" → "loben1", "SV-P 045" → "svp45".
 * Only the part before a slash counts; zero padding is dropped from every run of digits.
 */
export const normalizeNumber = (value: string): string =>
  (value.split("/")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(^|[^0-9])0+(?=[0-9])/g, "$1");

/**
 * "Greninja ex - 021/128" → "Greninja ex"; "Lightning Bolt (Borderless)" → "Lightning Bolt".
 * Only a single number-like token counts as a suffix, so subtitles survive:
 * "Stitch - Experiment 626" stays whole.
 */
export const baseProductName = (name: string): string =>
  name
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/\s+-\s*[A-Za-z0-9-]*\d[A-Za-z0-9-]*(?:\/[A-Za-z0-9-]+)?$/, "")
    .trim();

/** The card number without trailing extras — Digimon appends the rarity ("BT24-014 R"). */
export const productNumber = (product: TcgcsvProduct): string | null =>
  product.extendedData
    .find((field) => field.name === "Number")
    ?.value?.trim()
    .split(/\s+/)[0] || null;

/**
 * Names a group might be known by on our side, most specific first. TCGplayer
 * prefixes most sets with a series code — "SV03: Obsidian Flames",
 * "SM - Cosmic Eclipse", "EX Emerald" — calls a series' first set its "Base Set"
 * ("XY Base Set" is our "XY"), and splits subsets into their own groups
 * ("Crown Zenith: Galarian Gallery"), so each of those readings is tried.
 */
export const groupNameCandidates = (name: string): string[] => {
  const candidates = [name];
  const separator = name.match(/^(.+?)(?::| - )(.+)$/);
  if (separator) {
    candidates.push(separator[2]!, separator[1]!);
  }
  for (const candidate of [...candidates]) {
    const withoutBaseSet = candidate.replace(/\s+Base Set$/i, "");
    if (withoutBaseSet !== candidate) candidates.push(withoutBaseSet);
  }
  for (const candidate of [...candidates]) {
    // A leading all-caps series code of 2–4 letters: "EX Emerald" → "Emerald".
    const withoutSeries = candidate.trim().replace(/^[A-Z]{2,4}\s+(?=\S)/, "");
    if (withoutSeries !== candidate.trim()) candidates.push(withoutSeries);
  }
  return [...new Set(candidates.map(normalizeName).filter(Boolean))];
};

export interface GroupMatchOptions {
  /** TCGplayer group abbreviations equal our set codes for this game. */
  matchByCode: boolean;
  /** TCGplayer group name → our set code, for sets named too differently to match. */
  aliases?: Record<string, string>;
}

export const matchGroupToSet = (
  group: TcgcsvGroup,
  sets: MatchableSet[],
  { matchByCode, aliases = {} }: GroupMatchOptions,
): MatchableSet | null => {
  const alias = aliases[group.name];
  if (alias) {
    return sets.find((set) => set.code === alias) ?? null;
  }

  if (matchByCode && group.abbreviation) {
    // "BT-01" and "BT1" are the same code.
    const code = normalizeNumber(group.abbreviation);
    const byCode = sets.filter((set) => normalizeNumber(set.code) === code);
    if (byCode.length === 1) return byCode[0]!;
  }

  for (const candidate of groupNameCandidates(group.name)) {
    const byName = sets.filter((set) => normalizeName(set.name) === candidate);
    if (byName.length === 1) return byName[0]!;
  }
  return null;
};

const groupBy = <T>(items: T[], key: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
};

const namesAgree = (a: string, b: string): boolean =>
  a === b || (a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a)));

/** The product's name with any trailing number but every qualifier kept: "Nami (OP01-016) (SP)". */
const fullProductName = (name: string): string =>
  normalizeName(name.replace(/\s+-\s*[A-Za-z0-9-]*\d[A-Za-z0-9-]*(?:\/[A-Za-z0-9-]+)?$/, ""));

export const productRarity = (product: TcgcsvProduct): string | null =>
  product.extendedData.find((field) => field.name === "Rarity")?.value?.trim() || null;

/** Keeps only the finishes (TCGplayer subtypes) that belong to one of our cards. */
export type FinishFilter = (subType: string) => boolean;

export interface CardMatch {
  card: MatchableCard;
  /** Absent: every finish of the product is this card's. */
  finishes?: FinishFilter;
}

/** How a game's cards line up with TCGplayer products, where it differs from the default. */
export interface CardRules {
  /** Our collector number → the key TCGplayer's number is compared on (default `normalizeNumber`). */
  numberKey?: (collectorNumber: string) => string;
  /**
   * For games where one TCGplayer product covers several of our cards — each
   * finish or edition is its own card on our side — which of the product's
   * finishes belong to `card`, or `null` when this product isn't that card's.
   */
  finishes?: (
    card: MatchableCard,
    product: TcgcsvProduct,
    pass: { lenient: boolean },
  ) => FinishFilter | null;
}

/**
 * Pre-indexes a pool of cards (one set's, or a whole game's when its numbers
 * are unique game-wide) so each product lookup is O(1).
 *
 * A product matches by collector number when the names agree too; several
 * cards on one number are told apart by exact name ("Kaido & Linlin (Parallel)"),
 * then rarity (Yu-Gi-Oh! prints a number in several rarities), then — for games
 * with `finishes` — split across all of them by finish. Without a number, a
 * name unique within the pool matches.
 */
export const createCardMatcher = (
  cards: MatchableCard[],
  rules: CardRules = {},
  { lenient = false }: { lenient?: boolean } = {},
) => {
  const numberKey = rules.numberKey ?? normalizeNumber;
  const byNumber = groupBy(cards, (card) => numberKey(card.collectorNumber));
  const byName = groupBy(cards, (card) => normalizeName(card.name));

  const withFinishes = (pool: MatchableCard[], product: TcgcsvProduct): CardMatch[] => {
    if (!rules.finishes) return pool.length === 1 ? [{ card: pool[0]! }] : [];
    return pool.flatMap((card) => {
      const finishes = rules.finishes!(card, product, { lenient });
      return finishes ? [{ card, finishes }] : [];
    });
  };

  /**
   * `setId`: the set the product's TCGplayer group corresponds to, when known —
   * it tells a card from its reprint in another set ("OP03-008" and "_r2").
   */
  return (product: TcgcsvProduct, { setId }: { setId?: string } = {}): CardMatch[] => {
    const name = normalizeName(baseProductName(product.name));
    const number = productNumber(product);

    if (number) {
      // A number alone isn't trusted: reprint subsets keep the original print's
      // number on TCGplayer ("Delcatty 5/109") while we renumber them (#005 is
      // another card). The names must agree too, loosely — one may carry a
      // suffix the other lacks ("Pikachu" vs "Pikachu ex").
      let sameNumber = (byNumber.get(normalizeNumber(number)) ?? []).filter((card) =>
        namesAgree(normalizeName(card.name), name),
      );
      if (sameNumber.length > 1 && setId) {
        const inSet = sameNumber.filter((card) => card.setId === setId);
        if (inSet.length > 0) sameNumber = inSet;
      }
      if (sameNumber.length === 1) return withFinishes(sameNumber, product);
      if (sameNumber.length > 1) {
        const full = fullProductName(product.name);
        const exact = sameNumber.filter((card) => normalizeName(card.name) === full);
        if (exact.length === 1) return withFinishes(exact, product);

        const rarity = productRarity(product);
        if (rarity) {
          const wanted = normalizeName(rarity);
          const sameRarity = sameNumber.filter(
            (card) => card.rarity && normalizeName(card.rarity) === wanted,
          );
          if (sameRarity.length === 1) return withFinishes(sameRarity, product);
          // TCGplayer qualifies some rarities ours don't: "Prismatic Ultimate Rare" is our "Ultimate Rare".
          if (sameRarity.length === 0) {
            const qualified = sameNumber.filter(
              (card) => card.rarity && wanted.endsWith(normalizeName(card.rarity)),
            );
            if (qualified.length === 1) return withFinishes(qualified, product);
          }
        }

        return rules.finishes ? withFinishes(sameNumber, product) : [];
      }
    }

    const sameName = byName.get(name) ?? [];
    return sameName.length === 1 ? withFinishes(sameName, product) : [];
  };
};
