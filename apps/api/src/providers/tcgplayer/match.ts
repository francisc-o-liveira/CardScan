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

export const productNumber = (product: TcgcsvProduct): string | null =>
  product.extendedData.find((field) => field.name === "Number")?.value?.trim() || null;

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
    const code = group.abbreviation.toLowerCase();
    const byCode = sets.filter((set) => set.code.toLowerCase() === code);
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

/** Pre-indexes one set's cards so each product lookup is O(1). */
export const createCardMatcher = (cards: MatchableCard[]) => {
  const byNumber = groupBy(cards, (card) => normalizeNumber(card.collectorNumber));
  const byName = groupBy(cards, (card) => normalizeName(card.name));

  return (product: TcgcsvProduct): MatchableCard | null => {
    const name = normalizeName(baseProductName(product.name));
    const number = productNumber(product);

    if (number) {
      // A number alone isn't trusted: reprint subsets keep the original print's
      // number on TCGplayer ("Delcatty 5/109") while we renumber them (#005 is
      // another card). The names must agree too, loosely — one may carry a
      // suffix the other lacks ("Pikachu" vs "Pikachu ex").
      const sameNumber = (byNumber.get(normalizeNumber(number)) ?? []).filter((card) =>
        namesAgree(normalizeName(card.name), name),
      );
      if (sameNumber.length === 1) return sameNumber[0]!;
      if (sameNumber.length > 1) {
        const exact = sameNumber.filter((card) => normalizeName(card.name) === name);
        return exact.length === 1 ? exact[0]! : null;
      }
    }

    const sameName = byName.get(name) ?? [];
    return sameName.length === 1 ? sameName[0]! : null;
  };
};
