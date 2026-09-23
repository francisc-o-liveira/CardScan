import { z } from "zod";
import { CARD_CONDITIONS, SUPPORTED_LANGUAGES } from "@cardscan/config";
import { paginationSchema } from "./common";

const conditionSchema = z.enum(CARD_CONDITIONS);
const languageSchema = z.enum(SUPPORTED_LANGUAGES);
const quantitySchema = z.coerce.number().int().min(1).max(999);

export const collectionQuerySchema = paginationSchema.extend({
  query: z.string().trim().min(1).optional(),
  tcg: z.string().trim().min(1).optional(),
  setId: z.string().uuid().optional(),
  condition: conditionSchema.optional(),
});
export type CollectionQueryInput = z.infer<typeof collectionQuerySchema>;

export const addCollectionItemSchema = z.object({
  cardId: z.string().uuid(),
  quantity: quantitySchema.default(1),
  condition: conditionSchema.default("NM"),
  language: languageSchema.default("en"),
  /** When the card came from a scan: the scan is confirmed as this card in the same request. */
  scanId: z.string().uuid().optional(),
});
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;

export const updateCollectionItemSchema = z
  .object({
    /** 0 removes the copies. */
    quantity: z.coerce.number().int().min(0).max(999).optional(),
    condition: conditionSchema.optional(),
    language: languageSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });
export type UpdateCollectionItemInput = z.infer<typeof updateCollectionItemSchema>;

/** Card ids the client is displaying, comma-separated: the catalog grids ask which ones the user owns. */
export const ownedQuerySchema = z.object({
  cardIds: z
    .string()
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1).max(200)),
});
