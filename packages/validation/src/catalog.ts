import { z } from "zod";
import { paginationSchema } from "./common";

export const cardQuerySchema = paginationSchema.extend({
  tcg: z.string().trim().min(1).optional(),
  setId: z.string().uuid().optional(),
  query: z.string().trim().min(1).optional(),
});
export type CardQueryInput = z.infer<typeof cardQuerySchema>;

export const setQuerySchema = z.object({
  tcg: z.string().trim().min(1).optional(),
});
export type SetQueryInput = z.infer<typeof setQuerySchema>;
