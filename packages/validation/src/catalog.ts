import { z } from "zod";
import { paginationSchema } from "./common";

export const cardQuerySchema = paginationSchema.extend({
  tcg: z.string().trim().min(1).optional(),
  setId: z.string().uuid().optional(),
  query: z.string().trim().min(1).optional(),
});
export type CardQueryInput = z.infer<typeof cardQuerySchema>;

export const PRICE_HISTORY_RANGES = ["1m", "3m", "6m", "1y"] as const;

export const priceHistoryQuerySchema = z.object({
  range: z.enum(PRICE_HISTORY_RANGES).default("3m"),
});
export type PriceHistoryQueryInput = z.infer<typeof priceHistoryQuerySchema>;

export const setQuerySchema = z.object({
  tcg: z.string().trim().min(1).optional(),
});
export type SetQueryInput = z.infer<typeof setQuerySchema>;
