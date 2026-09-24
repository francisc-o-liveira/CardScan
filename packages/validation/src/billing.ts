import { z } from "zod";

export const checkoutSchema = z.object({
  /** A subscription plan or a one-off scan pack. */
  product: z.enum(["monthly", "yearly", "scans_25", "scans_100"]),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const webAdCompleteSchema = z.object({ sessionId: z.string().uuid() });
