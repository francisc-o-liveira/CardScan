import { z } from "zod";
import { SUPPORTED_TCGS } from "@cardscan/config";

/** The multipart fields sent along with the photo: the game, when the user says which one it is. */
export const createScanSchema = z.object({
  tcg: z.enum(SUPPORTED_TCGS).optional(),
});

export const confirmScanSchema = z.object({
  cardId: z.string().uuid(),
});
export type ConfirmScanInput = z.infer<typeof confirmScanSchema>;
