export type TcgdexImageQuality = "high" | "low";
export type TcgdexImageFormat = "webp" | "png" | "jpg";

/** Card images need a `/{quality}.{format}` suffix appended to the base URL TCGdex returns. */
export const buildCardImageUrl = (
  base: string,
  quality: TcgdexImageQuality = "high",
  format: TcgdexImageFormat = "webp",
): string => `${base}/${quality}.${format}`;

/** Set logos/symbols just need a `.{format}` suffix — no quality segment. */
export const buildAssetUrl = (base: string, format: TcgdexImageFormat = "webp"): string =>
  `${base}.${format}`;
