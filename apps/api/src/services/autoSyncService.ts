import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { createProvider, isCatalogSlug } from "../providers/registry";
import { syncCatalog } from "./catalogSyncService";
import { syncMagicCatalog } from "./magicSyncService";
import { syncPokemonCatalog } from "./pokemonSyncService";
import { PRICE_GAMES, syncPrices } from "./priceSyncService";
import { syncYugiohCatalog } from "./yugiohSyncService";

const HOUR_MS = 60 * 60 * 1000;
const CHECK_EVERY_MS = HOUR_MS;
const STARTUP_DELAY_MS = 15_000;

const STATE_FILE = path.join(env.ASSETS_DIR, "sync-state.json");

type JobKind = "catalog" | "prices";
type SyncState = Record<string, string>;

export const jobKey = (kind: JobKind, slug: string) => `${kind}:${slug}`;

/** A job is due when it never ran, or last ran longer ago than its interval. */
export const isDue = (lastRun: string | undefined, intervalHours: number, now = Date.now()): boolean => {
  if (!lastRun) return true;
  const last = Date.parse(lastRun);
  return Number.isNaN(last) || now - last >= intervalHours * HOUR_MS;
};

const readState = async (): Promise<SyncState> => {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as SyncState;
  } catch {
    return {};
  }
};

const writeState = async (state: SyncState) => {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
};

const syncCatalogFor = async (slug: string) => {
  if (slug === "pokemon") await syncPokemonCatalog();
  else if (slug === "magic") await syncMagicCatalog();
  else if (slug === "yugioh") await syncYugiohCatalog();
  else if (isCatalogSlug(slug)) await syncCatalog(createProvider(slug), {});
  else throw new Error(`No catalog sync for "${slug}"`);
};

const GAMES = ["pokemon", "magic", "yugioh", "lorcana", "onepiece", "digimon", "starwars", "fab"] as const;

let running = false;

/**
 * One pass: brings every game up to date. A game with no cards is imported straight away;
 * otherwise the catalog is refreshed weekly and prices daily. Jobs run one at a time and a
 * failure in one never stops the others — it is simply retried on the next pass.
 */
export const runAutoSync = async (log: (message: string) => void = console.log): Promise<void> => {
  if (running) return;
  running = true;
  try {
    const state = await readState();
    const run = async (kind: JobKind, slug: string, job: () => Promise<unknown>) => {
      const start = Date.now();
      log(`[auto-sync] ${kind} ${slug}: starting`);
      try {
        await job();
        state[jobKey(kind, slug)] = new Date().toISOString();
        await writeState(state);
        log(`[auto-sync] ${kind} ${slug}: done in ${((Date.now() - start) / 1000).toFixed(0)}s`);
        return true;
      } catch (error) {
        log(`[auto-sync] ${kind} ${slug}: failed (${error instanceof Error ? error.message : error}), will retry`);
        return false;
      }
    };

    for (const slug of GAMES) {
      const tcg = await prisma.tcg.findUnique({ where: { slug }, select: { id: true } });
      const hasCards = tcg ? (await prisma.card.count({ where: { tcgId: tcg.id } })) > 0 : false;
      // A catalog imported by hand before auto sync existed counts as synced now, not as overdue.
      if (hasCards && !state[jobKey("catalog", slug)]) {
        state[jobKey("catalog", slug)] = new Date().toISOString();
        await writeState(state);
      }
      const catalogDue = !hasCards || isDue(state[jobKey("catalog", slug)], env.AUTO_SYNC_CATALOG_HOURS);
      let catalogOk = false;
      if (catalogDue) catalogOk = await run("catalog", slug, () => syncCatalogFor(slug));

      const pricesDue = isDue(state[jobKey("prices", slug)], env.AUTO_SYNC_PRICES_HOURS);
      if ((pricesDue || catalogOk) && slug in PRICE_GAMES && (hasCards || catalogOk)) {
        await run("prices", slug, () => syncPrices(slug));
      }
    }
  } finally {
    running = false;
  }
};

/** Starts the background loop: a first pass shortly after boot, then one check an hour. */
export const startAutoSync = (): void => {
  if (!env.AUTO_SYNC) return;
  const pass = () => runAutoSync().catch((error) => console.warn("[auto-sync] pass failed:", error));
  setTimeout(pass, STARTUP_DELAY_MS).unref();
  setInterval(pass, CHECK_EVERY_MS).unref();
  console.log(
    `[auto-sync] on: catalogs every ${env.AUTO_SYNC_CATALOG_HOURS}h, prices every ${env.AUTO_SYNC_PRICES_HOURS}h (AUTO_SYNC=false turns it off)`,
  );
};
