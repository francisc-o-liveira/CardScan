import type { ScryfallCard, ScryfallImageUris } from "./scryfall.types";

type ImageSize = keyof ScryfallImageUris;

/**
 * Double-faced cards (transform, modal DFC, art series, ...) have no top-level `image_uris` —
 * the images live per-face instead. We fall back to the first face that has one.
 */
export const getCardImageUrl = (card: ScryfallCard, size: ImageSize = "large"): string | null => {
  const direct = card.image_uris?.[size];
  if (direct) return direct;

  const fromFace = card.card_faces
    ?.map((face) => face.image_uris?.[size])
    .find((url): url is string => Boolean(url));

  return fromFace ?? null;
};
