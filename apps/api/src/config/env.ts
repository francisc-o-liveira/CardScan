import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3001"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  POKEMON_API_URL: z.string().min(1).default("https://api.tcgdex.net/v2/en"),
  MAGIC_API_URL: z.string().min(1).default("https://api.scryfall.com"),
  YUGIOH_API_URL: z.string().min(1).default("https://db.ygoprodeck.com/api/v7"),
  LORCANA_API_URL: z.string().min(1).default("https://api.lorcast.com/v0"),
  ONEPIECE_API_URL: z.string().min(1).default("https://optcgapi.com/api"),
  DIGIMON_API_URL: z.string().min(1).default("https://digimoncard.io/api-public"),
  STARWARS_API_URL: z.string().min(1).default("https://api.swu-db.com"),
  FAB_DATA_URL: z
    .string()
    .min(1)
    .default("https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english"),
  // Daily mirror of TCGplayer's catalog + market prices (https://tcgcsv.com)
  TCGPLAYER_PRICES_URL: z.string().min(1).default("https://tcgcsv.com/tcgplayer"),
  /** tcgcsv responses are cached here for ~a day — tcgcsv asks for one fetch per file per 24h. */
  TCGPLAYER_CACHE_DIR: z.string().min(1).default(path.resolve(__dirname, "../../storage/tcgcsv-cache")),
  ASSETS_DIR: z.string().min(1).default(path.resolve(__dirname, "../../storage")),
  API_PUBLIC_URL: z.string().min(1).default("http://localhost:4100"),
  /** Card recognition data: the downloaded model and the visual index of the catalog. */
  RECOGNITION_DIR: z.string().min(1).default(path.resolve(__dirname, "../../storage/recognition")),
  /** Where the recognition model runs. "auto" uses the GPU through DirectML on Windows, else the CPU. */
  /** TCGplayer's own price history, fetched when a card's chart is opened. Off in tests. */
  TCGPLAYER_HISTORY: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "test" ? "false" : "true")
    .transform((value) => value === "true"),
  TCGPLAYER_HISTORY_URL: z.string().min(1).default("https://infinite-api.tcgplayer.com"),
  /**
   * Read the number printed on the card to tell reprints apart (OCR). Off until it has been checked on real
   * phone photos: the simulated ones are too small to carry legible print, and it adds ~1.4s to a scan.
   */
  RECOGNITION_READ_PRINT: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /** Keep catalogs and prices up to date in the background. On by default only while developing. */
  AUTO_SYNC: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? "true" : "false")
    .transform((value) => value === "true"),
  AUTO_SYNC_CATALOG_HOURS: z.coerce.number().positive().default(24),
  AUTO_SYNC_PRICES_HOURS: z.coerce.number().positive().default(24),
  RECOGNITION_DEVICE: z.enum(["auto", "cpu", "dml"]).default("auto"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
