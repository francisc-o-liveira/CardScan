export const CARD_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

export const CARD_CONDITION_LABELS: Record<(typeof CARD_CONDITIONS)[number], string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const SUPPORTED_LANGUAGES = ["en", "pt", "ja", "es", "fr", "de", "it"] as const;

export const LANGUAGE_LABELS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: "English",
  pt: "Portuguese",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
};

export const SUPPORTED_TCGS = [
  "pokemon",
  "magic",
  "yugioh",
  "lorcana",
  "onepiece",
  "digimon",
  "starwars",
  "fab",
] as const;

export type SupportedTcg = (typeof SUPPORTED_TCGS)[number];

export const TCG_LABELS: Record<SupportedTcg, string> = {
  pokemon: "Pokémon",
  magic: "Magic: The Gathering",
  yugioh: "Yu-Gi-Oh!",
  lorcana: "Disney Lorcana",
  onepiece: "One Piece",
  digimon: "Digimon",
  starwars: "Star Wars: Unlimited",
  fab: "Flesh and Blood",
};

/** Compact names for filter chips, badges and the mobile game switcher. */
export const TCG_SHORT_LABELS: Record<SupportedTcg, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
  lorcana: "Lorcana",
  onepiece: "One Piece",
  digimon: "Digimon",
  starwars: "Star Wars",
  fab: "Flesh & Blood",
};

/**
 * Accent per game, used only for badges, chips and active states — never to
 * re-theme the whole UI.
 *
 * These are an evenly spaced hue ramp rather than attempts at each publisher's
 * real brand colour: we can't license those marks, and a designed family reads
 * as one product where eight borrowed palettes would not. Colour is always
 * paired with a label and icon, so it is never the sole identifier.
 */
export const TCG_COLORS: Record<SupportedTcg, string> = {
  pokemon: "#FFC61E",
  magic: "#F2751A",
  onepiece: "#FF4D4D",
  lorcana: "#EC4899",
  yugioh: "#8B5CF6",
  starwars: "#3B82F6",
  digimon: "#22D3EE",
  fab: "#10B981",
};

/**
 * Whether the card catalog for a game is actually imported and queryable.
 * Drives honest UI — "live" games are browsable, "planned" ones say so rather
 * than dead-ending the user in an empty grid.
 */
export const TCG_CATALOG_STATUS: Record<SupportedTcg, "live" | "planned"> = {
  pokemon: "live",
  magic: "live",
  yugioh: "live",
  lorcana: "planned",
  onepiece: "planned",
  digimon: "planned",
  starwars: "planned",
  fab: "planned",
};

/** Games with a searchable catalog today, in the order they should be offered. */
export const LIVE_TCGS = SUPPORTED_TCGS.filter(
  (slug) => TCG_CATALOG_STATUS[slug] === "live",
);

/**
 * Default feature flag state. Flags let features ship disabled before their
 * phase lands, per the project's staged-rollout approach.
 */
export const FEATURE_FLAGS = {
  ENABLE_POKEMON: true,
  ENABLE_MAGIC: true,
  ENABLE_YUGIOH: true,
  ENABLE_LORCANA: true,
  ENABLE_ONEPIECE: true,
  ENABLE_DIGIMON: true,
  ENABLE_STARWARS: true,
  ENABLE_FAB: true,
  ENABLE_DECKS: false,
  ENABLE_PRICE_ALERTS: false,
  ENABLE_AI_RECOGNITION: false,
  /** Collection/wishlist writes need API routes that don't exist yet. */
  ENABLE_COLLECTION: false,
  ENABLE_WISHLIST: false,
  ENABLE_SCANNING: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
