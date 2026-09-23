import { z } from "zod";

export const confirmScanSchema = z.object({
  cardId: z.string().uuid(),
});
export type ConfirmScanInput = z.infer<typeof confirmScanSchema>;
