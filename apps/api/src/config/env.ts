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
  ASSETS_DIR: z.string().min(1).default(path.resolve(__dirname, "../../storage")),
  API_PUBLIC_URL: z.string().min(1).default("http://localhost:4100"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
