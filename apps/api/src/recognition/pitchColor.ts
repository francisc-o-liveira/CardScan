import sharp from "sharp";

/**
 * Flesh and Blood prints the same card in Red, Yellow and Blue with identical artwork: the only marks that
 * differ are the pitch value and a thin coloured line along the top of the title bar. The picture model
 * cannot tell those versions apart, but the colour of that line can.
 */
export type PitchColor = "Red" | "Yellow" | "Blue";

/** "Voltic Bolt (Red)" -> "Red". Cards without a pitch, like heroes and equipment, have none. */
export const pitchOf = (cardName: string): PitchColor | null => {
  const match = /\((Red|Yellow|Blue)\)\s*$/.exec(cardName);
  return (match?.[1] as PitchColor | undefined) ?? null;
};

/** Where the line sits on a straightened card, as fractions of its height and width. */
const BAND = { top: 0.038, bottom: 0.056, left: 0.3, right: 0.7 };
/** Pixels less saturated than this are card border or paper, not the coloured line. */
const MIN_SATURATION = 0.35;
const MIN_LINE_PIXELS = 20;

const hueOf = (r: number, g: number, b: number): { hue: number; saturation: number; value: number } => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max * 255 === r) hue = ((g - b) / 255 / delta) % 6;
    else if (max * 255 === g) hue = (b - r) / 255 / delta + 2;
    else hue = (r - g) / 255 / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { hue, saturation: max === 0 ? 0 : delta / max, value: max };
};

/** The pitch colour of a straightened Flesh and Blood card, or null when the line cannot be read. */
export const detectPitchColor = async (card: Buffer): Promise<PitchColor | null> => {
  const { width = 0, height = 0 } = await sharp(card).metadata();
  if (!width || !height) return null;

  const { data, info } = await sharp(card)
    .extract({
      left: Math.floor(width * BAND.left),
      top: Math.floor(height * BAND.top),
      width: Math.floor(width * (BAND.right - BAND.left)),
      height: Math.max(1, Math.floor(height * (BAND.bottom - BAND.top))),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const votes: Record<PitchColor, number> = { Red: 0, Yellow: 0, Blue: 0 };
  for (let i = 0; i < info.width * info.height; i++) {
    const { hue, saturation, value } = hueOf(data[i * 3]!, data[i * 3 + 1]!, data[i * 3 + 2]!);
    if (saturation < MIN_SATURATION || value < 0.3) continue;
    if (hue < 20 || hue >= 330) votes.Red++;
    else if (hue >= 35 && hue < 75) votes.Yellow++;
    else if (hue >= 180 && hue < 260) votes.Blue++;
  }
  const [color, count] = (Object.entries(votes) as [PitchColor, number][]).sort((a, b) => b[1] - a[1])[0]!;
  return count >= MIN_LINE_PIXELS ? color : null;
};
