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

export const SUPPORTED_TCGS = ["pokemon", "magic"] as const;

export const TCG_LABELS: Record<(typeof SUPPORTED_TCGS)[number], string> = {
  pokemon: "Pokémon",
  magic: "Magic: The Gathering",
};

/**
 * Default feature flag state. Flags let features ship disabled before their
 * phase lands, per the project's staged-rollout approach.
 */
export const FEATURE_FLAGS = {
  ENABLE_POKEMON: true,
  ENABLE_MAGIC: true,
  ENABLE_DECKS: false,
  ENABLE_PRICE_ALERTS: false,
  ENABLE_AI_RECOGNITION: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
