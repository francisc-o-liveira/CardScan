import sharp from "sharp";
import { getOpenCv, type OpenCv } from "./opencv";

/** Output size of a straightened card: 63x88mm at ~7.75px/mm, the size of Scryfall's "normal" images. */
export const CARD_WIDTH = 488;
export const CARD_HEIGHT = 680;
const CARD_ASPECT = 63 / 88;

/** Photos are analysed at this size: large enough to find edges, small enough to be fast. */
const WORKING_SIZE = 1000;

export interface RectifyResult {
  /** The card, upright and flat, as a PNG of CARD_WIDTH x CARD_HEIGHT. */
  image: Buffer;
  /** False when no card outline was found and the centre of the photo was used instead. */
  found: boolean;
}

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Sorts four corners into top-left, top-right, bottom-right, bottom-left. */
const orderCorners = (points: Point[]): [Point, Point, Point, Point] => {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0]!, byDiff[0]!, bySum[3]!, byDiff[3]!];
};

/** Short side over long side of a quadrilateral, averaged over opposite sides. */
const quadAspect = ([tl, tr, br, bl]: Point[]) => {
  const width = (distance(tl!, tr!) + distance(bl!, br!)) / 2;
  const height = (distance(tl!, bl!) + distance(tr!, br!)) / 2;
  return Math.min(width, height) / Math.max(width, height);
};

const rotatedRectCorners = (rect: { center: Point; size: { width: number; height: number }; angle: number }) => {
  const angle = (rect.angle * Math.PI) / 180;
  const cos = Math.cos(angle) / 2;
  const sin = Math.sin(angle) / 2;
  const { width: w, height: h } = rect.size;
  const { x, y } = rect.center;
  return [
    { x: x - w * cos + h * sin, y: y - w * sin - h * cos },
    { x: x + w * cos + h * sin, y: y + w * sin - h * cos },
    { x: x + w * cos - h * sin, y: y + w * sin + h * cos },
    { x: x - w * cos - h * sin, y: y - w * sin + h * cos },
  ];
};

/** The largest card-shaped outline in a binary edge/threshold image, or null. */
const findCardQuad = (cv: OpenCv, binary: InstanceType<OpenCv["Mat"]>, area: number): Point[] | null => {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let best: { points: Point[]; area: number } | null = null;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const contourArea = cv.contourArea(contour);
      // A card fills a good part of a scan photo; ignore specks and texture.
      if (contourArea < area * 0.08 || (best && contourArea <= best.area)) {
        contour.delete();
        continue;
      }

      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, cv.arcLength(contour, true) * 0.02, true);
      let points: Point[];
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        points = Array.from({ length: 4 }, (_, k) => ({ x: approx.data32S[k * 2]!, y: approx.data32S[k * 2 + 1]! }));
      } else {
        // Rounded corners, glare or a finger often break the outline: fall back to the tightest rectangle.
        points = rotatedRectCorners(cv.minAreaRect(contour) as never);
      }
      approx.delete();
      contour.delete();

      const aspect = quadAspect(orderCorners(points));
      if (aspect > CARD_ASPECT - 0.12 && aspect < CARD_ASPECT + 0.12) best = { points, area: contourArea };
    }
    return best?.points ?? null;
  } finally {
    contours.delete();
    hierarchy.delete();
  }
};

/**
 * Finds the card in a photo and returns it straightened and upright, so it can be compared with the
 * clean catalog scans. Two detectors run in turn (edges, then brightness threshold); if neither finds a
 * card-shaped outline, the centre of the photo is used, which is where the app's frame asks for it.
 */
export const rectifyCard = async (photo: Buffer): Promise<RectifyResult> => {
  const cv = await getOpenCv();
  const { data, info } = await sharp(photo)
    .rotate()
    .resize(WORKING_SIZE, WORKING_SIZE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const source = cv.matFromArray(height, width, cv.CV_8UC4, data);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const warped = new cv.Mat();

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    cv.Canny(blurred, binary, 40, 120);
    cv.dilate(binary, binary, kernel, new cv.Point(-1, -1), 2);
    let quad = findCardQuad(cv, binary, width * height);

    if (!quad) {
      cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      quad = findCardQuad(cv, binary, width * height);
    }

    let corners: [Point, Point, Point, Point];
    const found = quad !== null;
    if (quad) {
      corners = orderCorners(quad);
      // A card lying sideways: turn the long side vertical (the 180° case is handled by the matcher).
      if (distance(corners[0], corners[1]) > distance(corners[0], corners[3])) {
        corners = [corners[3], corners[0], corners[1], corners[2]];
      }
    } else {
      const h = Math.min(height * 0.8, (width * 0.8) / CARD_ASPECT);
      const w = h * CARD_ASPECT;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      corners = [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ];
    }

    const from = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flatMap((p) => [p.x, p.y]));
    const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, CARD_WIDTH, 0, CARD_WIDTH, CARD_HEIGHT, 0, CARD_HEIGHT]);
    const transform = cv.getPerspectiveTransform(from, to);
    cv.warpPerspective(source, warped, transform, new cv.Size(CARD_WIDTH, CARD_HEIGHT), cv.INTER_LINEAR);
    from.delete();
    to.delete();
    transform.delete();

    const image = await sharp(Buffer.from(warped.data), {
      raw: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 4 },
    })
      .removeAlpha()
      .png()
      .toBuffer();
    return { image, found };
  } finally {
    for (const mat of [source, gray, blurred, binary, kernel, warped]) mat.delete();
  }
};
