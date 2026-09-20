import type { SupportedTcg } from "@cardscan/config";
import type { CatalogProvider } from "./catalog";
import { createDigimonProvider } from "./digimon/provider";
import { createFabProvider } from "./fab/provider";
import { createLorcanaProvider } from "./lorcana/provider";
import { createOnePieceProvider } from "./onepiece/provider";
import { createStarWarsProvider } from "./starwars/provider";

/**
 * Games served by the shared catalog sync. (Pokémon, Magic and Yu-Gi-Oh! predate it and keep their
 * own dedicated sync services.)
 */
const factories = {
  lorcana: createLorcanaProvider,
  onepiece: createOnePieceProvider,
  digimon: createDigimonProvider,
  starwars: createStarWarsProvider,
  fab: createFabProvider,
} satisfies Partial<Record<SupportedTcg, () => CatalogProvider>>;

export type CatalogSlug = keyof typeof factories;

export const CATALOG_SLUGS = Object.keys(factories) as CatalogSlug[];

export const isCatalogSlug = (value: string): value is CatalogSlug => value in factories;

export const createProvider = (slug: CatalogSlug): CatalogProvider => factories[slug]();
