import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { CLS_DIMS, EMBEDDING_DIM, EMBEDDING_MODEL } from "./embedder";

/** What the matcher needs to know about a catalog card, stored next to its vector. */
export interface IndexedCard {
  id: string;
  name: string;
  number: string;
  tcg: string;
  setId: string;
}

interface ShardHeader {
  model: string;
  dim: number;
  cards: IndexedCard[];
  /** Per-vector de-quantisation factor for the Int8 values in the matching .bin file. */
  scales: number[];
}

export interface SearchHit {
  index: number;
  score: number;
}

/** How much each half of the vector counts: the CLS token and the mean of the patch tokens. */
export interface SearchWeights {
  cls: number;
  mean: number;
}

export const DEFAULT_WEIGHTS: SearchWeights = { cls: 1, mean: 1 };

const indexDir = () => path.join(env.RECOGNITION_DIR, "index");
const shardName = (n: number) => `shard-${String(n).padStart(5, "0")}`;

/**
 * The visual index of the catalog. Vectors are quantised to Int8 (one scale per vector), which keeps
 * ~130k cards at ~100MB in memory with no measurable loss for nearest-neighbour search. Search is a brute
 * force scan: at this size it takes tens of milliseconds and needs no extra infrastructure.
 */
export class RecognitionIndex {
  constructor(
    readonly cards: IndexedCard[],
    private readonly vectors: Int8Array,
    private readonly scales: Float32Array,
  ) {}

  get size(): number {
    return this.cards.length;
  }

  search(query: Float32Array, k: number, weights: SearchWeights = DEFAULT_WEIGHTS, tcg?: string): SearchHit[] {
    const total = weights.cls + weights.mean;
    const wc = weights.cls / total;
    const wm = weights.mean / total;
    const hits: SearchHit[] = [];
    let floor = -Infinity;

    for (let i = 0; i < this.cards.length; i++) {
      if (tcg && this.cards[i]!.tcg !== tcg) continue;
      const base = i * EMBEDDING_DIM;
      let cls = 0;
      let mean = 0;
      if (wc > 0) for (let d = 0; d < CLS_DIMS; d++) cls += query[d]! * this.vectors[base + d]!;
      if (wm > 0) for (let d = CLS_DIMS; d < EMBEDDING_DIM; d++) mean += query[d]! * this.vectors[base + d]!;
      const score = (wc * cls + wm * mean) * this.scales[i]!;

      if (hits.length < k) {
        hits.push({ index: i, score });
        if (hits.length === k) {
          hits.sort((a, b) => b.score - a.score);
          floor = hits[k - 1]!.score;
        }
      } else if (score > floor) {
        hits[k - 1] = { index: i, score };
        hits.sort((a, b) => b.score - a.score);
        floor = hits[k - 1]!.score;
      }
    }
    return hits.sort((a, b) => b.score - a.score);
  }
}

const quantise = (vector: Float32Array, out: Int8Array, offset: number): number => {
  let max = 0;
  for (const value of vector) max = Math.max(max, Math.abs(value));
  const scale = max / 127 || 1;
  for (let d = 0; d < vector.length; d++) out[offset + d] = Math.round(vector[d]! / scale);
  return scale;
};

const listShards = async (): Promise<string[]> => {
  try {
    return (await fs.readdir(indexDir())).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
};

/** Appends a batch of indexed cards as a new shard. Shards make a long indexing run resumable. */
export const writeShard = async (cards: IndexedCard[], vectors: Float32Array[]): Promise<void> => {
  const dir = indexDir();
  await fs.mkdir(dir, { recursive: true });
  const name = shardName((await listShards()).length + 1);

  const data = new Int8Array(cards.length * EMBEDDING_DIM);
  const scales = vectors.map((vector, i) => quantise(vector, data, i * EMBEDDING_DIM));
  const header: ShardHeader = { model: EMBEDDING_MODEL, dim: EMBEDDING_DIM, cards, scales };

  // Vectors first, header last: a shard only counts once its header exists.
  await fs.writeFile(path.join(dir, `${name}.bin`), Buffer.from(data.buffer));
  await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(header));
};

const readShardHeader = async (file: string): Promise<ShardHeader> =>
  JSON.parse(await fs.readFile(path.join(indexDir(), file), "utf8")) as ShardHeader;

/** Ids already in the index, so an interrupted build picks up where it stopped. */
export const indexedCardIds = async (): Promise<Set<string>> => {
  const ids = new Set<string>();
  for (const file of await listShards()) {
    for (const card of (await readShardHeader(file)).cards) ids.add(card.id);
  }
  return ids;
};

export const loadIndex = async (): Promise<RecognitionIndex> => {
  const headers: ShardHeader[] = [];
  const buffers: Buffer[] = [];
  for (const file of await listShards()) {
    const header = await readShardHeader(file);
    if (header.model !== EMBEDDING_MODEL || header.dim !== EMBEDDING_DIM) continue;
    headers.push(header);
    buffers.push(await fs.readFile(path.join(indexDir(), file.replace(/\.json$/, ".bin"))));
  }

  const cards = headers.flatMap((header) => header.cards);
  const vectors = new Int8Array(cards.length * EMBEDDING_DIM);
  let offset = 0;
  for (const buffer of buffers) {
    vectors.set(new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength), offset);
    offset += buffer.byteLength;
  }
  return new RecognitionIndex(cards, vectors, Float32Array.from(headers.flatMap((header) => header.scales)));
};

let cached: Promise<RecognitionIndex> | undefined;
let cachedStamp = "";

/** Changes whenever a shard is added or rewritten, so a finished or resumed build is picked up. */
const indexStamp = async (): Promise<string> => {
  const shards = await listShards();
  if (shards.length === 0) return "empty";
  const last = await fs.stat(path.join(indexDir(), shards[shards.length - 1]!));
  return `${shards.length}:${last.mtimeMs}`;
};

/**
 * The index, loaded once per process and reloaded when the files on disk change. The check costs one
 * directory read per scan, so the API never needs a restart after the index is built or extended.
 */
export const getIndex = async (): Promise<RecognitionIndex> => {
  const stamp = await indexStamp();
  if (!cached || stamp !== cachedStamp) {
    cachedStamp = stamp;
    cached = loadIndex();
  }
  return cached;
};
