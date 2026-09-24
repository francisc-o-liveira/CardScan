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
  /** Affiliate programs: leave empty and the buy links still work, they just earn nothing. */
  AFFILIATE_TCGPLAYER_URL: z.string().optional(),
  AFFILIATE_EBAY_CAMPAIGN_ID: z.string().optional(),
  AFFILIATE_CARDMARKET_URL: z.string().optional(),
  AFFILIATE_CARDTRADER_URL: z.string().optional(),
  /** Scan requests one IP can make a minute: recognition is the most expensive thing the API does. */
  SCAN_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  /** Scans every user gets when they start, once. After that each watched ad gives the next batch. */
  WELCOME_SCAN_CREDITS: z.coerce.number().int().min(0).default(5),
  /** Optional extra free scans each UTC day, on top of the ads. 0 (the default) means only the welcome scans and ads. */
  FREE_SCANS_PER_DAY: z.coerce.number().int().min(0).default(0),
  /** Scans one watched rewarded ad gives (so: an ad every this many scans), and how many ads count a day. */
  REWARDED_AD_CREDITS: z.coerce.number().int().positive().default(5),
  REWARDED_ADS_PER_DAY: z.coerce.number().int().min(0).default(50),
  /** Web ads: how long a session must run before it pays, and how many count a day. */
  WEB_AD_MIN_SECONDS: z.coerce.number().int().min(0).default(15),
  WEB_ADS_PER_DAY: z.coerce.number().int().min(0).default(10),
  /** AdMob rewarded ad unit whose server-side verification callbacks are accepted; empty accepts any. */
  ADMOB_REWARDED_AD_UNIT_ID: z.string().optional(),
  /** Shared secret RevenueCat sends in the Authorization header of its webhook. */
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
  /** Stripe (web subscriptions): keys and the price ids of the two plans. */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  STRIPE_PRICE_SCANS_25: z.string().optional(),
  STRIPE_PRICE_SCANS_100: z.string().optional(),
  /** Where Stripe sends the user back after paying or cancelling. */
  WEB_PUBLIC_URL: z.string().min(1).default("http://localhost:3001"),
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
