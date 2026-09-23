import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import sharp from "sharp";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { embedImages } from "../recognition/embedder";
import { getIndex, type SearchWeights } from "../recognition/indexStore";
import { rectifyCard } from "../recognition/rectify";
import { createRandom, synthesizePhoto } from "./lib/syntheticPhoto";

/**
 * Measures recognition accuracy on simulated phone photos of indexed cards. For each sampled card it
 * builds a photo from a *different-resolution* image than the one indexed, runs it through the real
 * pipeline, and records where the true card ranks.
 *
 * Usage: tsx src/scripts/evaluateRecognition.ts [--samples 200] [--tcg pokemon] [--seed 7] [--save 8]
 */

const VARIANTS: Record<string, SearchWeights> = {
  cls: { cls: 1, mean: 0 },
  mean: { cls: 0, mean: 1 },
  both: { cls: 1, mean: 1 },
};

/** A different rendition than the index used, so the benchmark is not matching an image to itself. */
const photoSourceUrl = (url: string) => url.replace(/(assets\.tcgdex\.net\/.+)\/low\.(webp|png|jpg)$/, "$1/high.$2");

const flag = (args: string[], name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

interface Row {
  variant: string;
  rank: number;
  sameName: boolean;
  margin: number;
}

async function main() {
  const args = process.argv.slice(2);
  const samples = Number(flag(args, "--samples", "200"));
  const tcg = flag(args, "--tcg", "");
  const seed = Number(flag(args, "--seed", "7"));
  const save = Number(flag(args, "--save", "8"));
  const random = createRandom(seed);

  const index = await getIndex();
  const pool = index.cards.map((card, i) => ({ card, i })).filter(({ card }) => !tcg || card.tcg === tcg);
  if (pool.length === 0) throw new Error("Nothing indexed for that game yet");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const picked = pool.slice(0, samples);

  const urls = new Map(
    (
      await prisma.card.findMany({ where: { id: { in: picked.map((p) => p.card.id) } }, select: { id: true, imageUrl: true } })
    ).map((row) => [row.id, row.imageUrl!]),
  );

  const outDir = path.join(env.RECOGNITION_DIR, "eval");
  await fs.mkdir(outDir, { recursive: true });

  const rows: Row[] = [];
  let found = 0;
  let evaluated = 0;
  let totalMs = 0;

  for (const [n, { card }] of picked.entries()) {
    let source: Buffer;
    try {
      const response = await axios.get<ArrayBuffer>(photoSourceUrl(urls.get(card.id)!), {
        responseType: "arraybuffer",
        timeout: 20_000,
        // Scryfall rejects requests without an identifying User-Agent.
        headers: { "User-Agent": "CardScan/0.1 (recognition eval)", Accept: "image/*" },
      });
      source = Buffer.from(response.data);
    } catch {
      continue;
    }

    const photo = await synthesizePhoto(source, random);
    const start = Date.now();
    const rectified = await rectifyCard(photo);
    const flipped = await sharp(rectified.image).rotate(180).png().toBuffer();
    const [upright, upsideDown] = await embedImages([rectified.image, flipped]);
    totalMs += Date.now() - start;
    evaluated++;
    if (rectified.found) found++;

    if (n < save) {
      await fs.writeFile(path.join(outDir, `${n}-photo.jpg`), photo);
      await fs.writeFile(path.join(outDir, `${n}-rectified.png`), rectified.image);
    }

    for (const [variant, weights] of Object.entries(VARIANTS)) {
      const best = new Map<number, number>();
      for (const query of [upright!, upsideDown!]) {
        for (const hit of index.search(query, 25, weights)) {
          best.set(hit.index, Math.max(best.get(hit.index) ?? -Infinity, hit.score));
        }
      }
      const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
      const rank = ranked.findIndex(([i]) => index.cards[i]!.id === card.id);
      const top = index.cards[ranked[0]![0]]!;
      rows.push({
        variant,
        rank: rank < 0 ? Infinity : rank,
        sameName: top.name === card.name,
        margin: ranked[0]![1] - (ranked[1]?.[1] ?? 0),
      });
    }
    if ((n + 1) % 25 === 0) console.log(`[recognition-eval] ${n + 1}/${picked.length}`);
  }

  const pct = (x: number, total: number) => `${((100 * x) / total).toFixed(1)}%`;
  console.log(
    `\n[recognition-eval] ${evaluated} photos, index of ${index.size} cards${tcg ? ` (sampled from ${tcg})` : ""}. ` +
      `Card outline found in ${pct(found, evaluated)}; ${Math.round(totalMs / evaluated)} ms/photo (straighten + embed).`,
  );
  for (const variant of Object.keys(VARIANTS)) {
    const own = rows.filter((row) => row.variant === variant);
    console.log(
      `  ${variant.padEnd(5)} top-1 ${pct(own.filter((r) => r.rank === 0).length, own.length).padStart(6)}` +
        `  top-5 ${pct(own.filter((r) => r.rank < 5).length, own.length).padStart(6)}` +
        `  right card name at #1 ${pct(own.filter((r) => r.sameName).length, own.length).padStart(6)}`,
    );
  }

  console.log("\n  Calibration (both): top-1 accuracy by gap between the two best scores");
  const both = rows.filter((row) => row.variant === "both");
  const edges = [0, 0.01, 0.02, 0.04, 0.06, 0.08, 0.12, Infinity];
  for (let b = 0; b < edges.length - 1; b++) {
    const bucket = both.filter((row) => row.margin >= edges[b]! && row.margin < edges[b + 1]!);
    if (!bucket.length) continue;
    console.log(
      `    gap ${edges[b]!.toFixed(2)}–${edges[b + 1] === Infinity ? "∞   " : edges[b + 1]!.toFixed(2)}` +
        `  n=${String(bucket.length).padStart(4)}  top-1 ${pct(bucket.filter((r) => r.rank === 0).length, bucket.length)}`,
    );
  }
  console.log(`\n  Samples saved to ${outDir}`);
}

main()
  .catch((error) => {
    console.error("[recognition-eval] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
