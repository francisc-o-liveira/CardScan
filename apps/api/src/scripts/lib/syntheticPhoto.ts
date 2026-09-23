import sharp, { type OverlayOptions } from "sharp";
import { getOpenCv } from "../../recognition/opencv";

/** Deterministic random numbers (mulberry32), so a benchmark run can be repeated exactly. */
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Random = () => number;
const uniform = (random: Random, min: number, max: number) => min + (max - min) * random();

const PHOTO_WIDTH = 900;
const PHOTO_HEIGHT = 1200;

/** A plausible surface to lay a card on: a table, a plain mat, or a gradient. */
const makeBackground = (random: Random): Uint8Array => {
  const pixels = new Uint8Array(PHOTO_WIDTH * PHOTO_HEIGHT * 4);
  const kind = random();
  const base = [uniform(random, 20, 230), uniform(random, 20, 230), uniform(random, 20, 230)];
  const wood = [uniform(random, 90, 170), uniform(random, 55, 110), uniform(random, 25, 70)];
  const period = uniform(random, 18, 60);
  const other = [uniform(random, 20, 230), uniform(random, 20, 230), uniform(random, 20, 230)];

  for (let y = 0; y < PHOTO_HEIGHT; y++) {
    for (let x = 0; x < PHOTO_WIDTH; x++) {
      const i = (y * PHOTO_WIDTH + x) * 4;
      const noise = (random() - 0.5) * 18;
      for (let c = 0; c < 3; c++) {
        let value: number;
        if (kind < 0.4) value = wood[c]! * (0.85 + 0.15 * Math.sin((x + 8 * Math.sin(y / 40)) / period));
        else if (kind < 0.7) value = base[c]!;
        else value = base[c]! + ((other[c]! - base[c]!) * y) / PHOTO_HEIGHT;
        pixels[i + c] = Math.max(0, Math.min(255, value + noise));
      }
      pixels[i + 3] = 255;
    }
  }
  return pixels;
};

/**
 * Stands a clean catalog scan in for a phone photo of the card: laid on a surface, tilted, rotated,
 * seen in perspective, with uneven light, occasional glare, blur and JPEG compression. Not a substitute
 * for real photos, but it exercises every step of the pipeline (finding the card, straightening it,
 * matching it) against the same kinds of damage.
 */
export const synthesizePhoto = async (cardImage: Buffer, random: Random): Promise<Buffer> => {
  const cv = await getOpenCv();
  const card = await sharp(cardImage).resize(500).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: cw, height: ch } = card.info;

  const height = uniform(random, 0.45, 0.7) * PHOTO_HEIGHT;
  const width = (height * cw) / ch;
  const cx = PHOTO_WIDTH / 2 + uniform(random, -0.08, 0.08) * PHOTO_WIDTH;
  const cy = PHOTO_HEIGHT / 2 + uniform(random, -0.06, 0.06) * PHOTO_HEIGHT;
  // Mostly upright, sometimes upside down: the matcher has to cope with both.
  const angle = (uniform(random, -15, 15) + (random() < 0.1 ? 180 : 0)) * (Math.PI / 180);
  const jitter = () => uniform(random, -0.06, 0.06) * width;

  const corners = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([x, y]) => [
    cx + x! * Math.cos(angle) - y! * Math.sin(angle) + jitter(),
    cy + x! * Math.sin(angle) + y! * Math.cos(angle) + jitter(),
  ]);

  const source = cv.matFromArray(ch, cw, cv.CV_8UC4, card.data);
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, cw, 0, cw, ch, 0, ch]);
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flat());
  const transform = cv.getPerspectiveTransform(from, to);
  const warped = new cv.Mat();
  cv.warpPerspective(
    source,
    warped,
    transform,
    new cv.Size(PHOTO_WIDTH, PHOTO_HEIGHT),
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar(0, 0, 0, 0),
  );

  const background = makeBackground(random);
  const layer = warped.data;
  for (let i = 0; i < background.length; i += 4) {
    const alpha = layer[i + 3]! / 255;
    for (let c = 0; c < 3; c++) background[i + c] = background[i + c]! * (1 - alpha) + layer[i + c]! * alpha;
  }
  for (const mat of [source, from, to, transform, warped]) mat.delete();

  let photo = sharp(Buffer.from(background), { raw: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 4 } })
    .removeAlpha()
    .modulate({ brightness: uniform(random, 0.75, 1.2), saturation: uniform(random, 0.85, 1.15) })
    .linear(uniform(random, 0.85, 1.15), uniform(random, -12, 12));

  const layers: OverlayOptions[] = [];
  if (random() < 0.5) {
    const gx = cx + uniform(random, -0.3, 0.3) * width;
    const gy = cy + uniform(random, -0.3, 0.3) * height;
    const radius = uniform(random, 0.15, 0.35) * width;
    const opacity = uniform(random, 0.3, 0.6).toFixed(2);
    layers.push({
      input: Buffer.from(
        `<svg width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}"><defs><radialGradient id="g">` +
          `<stop offset="0" stop-color="#fff" stop-opacity="${opacity}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
          `</radialGradient></defs><ellipse cx="${gx}" cy="${gy}" rx="${radius}" ry="${radius * 0.6}" fill="url(#g)"/></svg>`,
      ),
    });
  }
  const flattened = await photo.png().toBuffer();
  photo = sharp(flattened).composite(layers);
  if (random() < 0.6) photo = sharp(await photo.png().toBuffer()).blur(uniform(random, 0.4, 1.4));

  return photo.jpeg({ quality: Math.round(uniform(random, 55, 85)) }).toBuffer();
};
