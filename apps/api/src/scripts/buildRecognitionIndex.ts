import "./lib/threadPool";
import https from "node:https";
import axios from "axios";
import { prisma } from "../config/prisma";
import { embedPrepared, prepareImages } from "../recognition/embedder";
import { indexImageUrl } from "../recognition/imageSources";
import {
  indexedCardIds,
  writeShard,
  type IndexedCard,
} from "../recognition/indexStore";

/**
 * Builds the visual index used by card recognition: downloads a small image of every catalog card,
 * turns it into a vector and stores it. Resumable: cards already indexed are skipped, so an interrupted
 * run continues where it stopped.
 *
 * Usage: tsx src/scripts/buildRecognitionIndex.ts [<tcg slug>|all] [--limit N]
 */

const SHARD_SIZE = 512;
/** Images per GPU pass. */
const BATCH_SIZE = 64;
/**
 * Downloads in flight. Each request spends most of its time waiting on the server, not transferring, so
 * throughput comes from many parallel requests on reused connections rather than from bandwidth.
 */
const CONCURRENCY = 160;
const RETRIES = 3;

const http = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY }),
  responseType: "arraybuffer",
  timeout: 20_000,
  headers: {
    "User-Agent": "CardScan/0.1 (recognition index)",
    Accept: "image/*",
  },
});

const download = async (url: string): Promise<Buffer | null> => {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await http.get<ArrayBuffer>(url);
      return Buffer.from(response.data);
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 404) return null;
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * attempt * attempt),
      );
    }
  }
  return null;
};

/** Runs `task` over `items` with at most `limit` in flight, keeping the input order. */
const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await task(items[i]!);
      }
    }),
  );
  return results;
};

async function main() {
  const args = process.argv.slice(2);
  const tcg = args.find((arg) => !arg.startsWith("--") && !/^\d+$/.test(arg));
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;

  const done = await indexedCardIds();
  const rows = await prisma.card.findMany({
    where: {
      imageUrl: { not: null },
      ...(tcg && tcg !== "all" ? { tcg: { slug: tcg } } : {}),
    },
    select: {
      id: true,
      name: true,
      collectorNumber: true,
      setId: true,
      imageUrl: true,
      tcg: { select: { slug: true } },
    },
    orderBy: { id: "asc" },
  });
  const pending = rows.filter((row) => !done.has(row.id)).slice(0, limit);

  const already = rows.filter((row) => done.has(row.id)).length;
  console.log(
    `[recognition-index] ${rows.length} cards with images${tcg ? ` (${tcg})` : ""}: ` +
      `${already} already indexed, ${pending.length} to index now.`,
  );

  const start = Date.now();
  let indexed = 0;
  let failed = 0;

  const fetchChunk = (offset: number) =>
    mapLimit(pending.slice(offset, offset + SHARD_SIZE), CONCURRENCY, (row) =>
      download(indexImageUrl(row.imageUrl!)),
    );

  // The next chunk downloads while the GPU works on the current one, so neither waits for the other.
  let nextImages = pending.length
    ? fetchChunk(0)
    : Promise.resolve([] as Array<Buffer | null>);
  for (let offset = 0; offset < pending.length; offset += SHARD_SIZE) {
    const chunk = pending.slice(offset, offset + SHARD_SIZE);
    const images = await nextImages;
    if (offset + SHARD_SIZE < pending.length)
      nextImages = fetchChunk(offset + SHARD_SIZE);

    const cards: IndexedCard[] = [];
    const vectors: Float32Array[] = [];
    const ready = chunk.flatMap((row, i) =>
      images[i] ? [{ row, image: images[i]! }] : [],
    );
    failed += chunk.length - ready.length;

    // While the GPU embeds one batch, the thread pool decodes the next.
    const batches = Array.from(
      { length: Math.ceil(ready.length / BATCH_SIZE) },
      (_, n) => ready.slice(n * BATCH_SIZE, (n + 1) * BATCH_SIZE),
    );
    let prepared = batches.length
      ? prepareImages(batches[0]!.map((item) => item.image))
      : undefined;
    for (let n = 0; n < batches.length; n++) {
      const batch = batches[n]!;
      const current = await prepared!;
      prepared =
        n + 1 < batches.length
          ? prepareImages(batches[n + 1]!.map((item) => item.image))
          : undefined;

      // Undecodable images were left out of the batch; line the vectors back up with their cards.
      const decoded = batch.filter((_, i) => !current.skipped.includes(i));
      failed += current.skipped.length;
      const embedded = await embedPrepared(current);
      decoded.forEach((item, i) => {
        cards.push({
          id: item.row.id,
          name: item.row.name,
          number: item.row.collectorNumber,
          tcg: item.row.tcg.slug,
          setId: item.row.setId,
        });
        vectors.push(embedded[i]!);
      });
    }

    if (cards.length) await writeShard(cards, vectors);
    indexed += cards.length;

    const elapsed = (Date.now() - start) / 1000;
    const rate = (offset + chunk.length) / elapsed;
    const eta = (pending.length - offset - chunk.length) / rate;
    console.log(
      `[recognition-index] ${offset + chunk.length}/${pending.length} ` +
        `(${rate.toFixed(1)}/s, ${failed} failed, ~${Math.round(eta / 60)} min left)`,
    );
  }

  console.log(
    `[recognition-index] Done in ${((Date.now() - start) / 60000).toFixed(1)} min — ${indexed} indexed, ${failed} failed.`,
  );
}

// Only when run as a script: importing this file must never start an indexing run.
if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[recognition-index] Fatal error:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
