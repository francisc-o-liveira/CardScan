import type { Request, Response } from "express";
import type { ApiResponse } from "@cardscan/types";
import { checkoutSchema } from "@cardscan/validation";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/AppError";
import * as billingService from "../services/billingService";

/** Web: the Stripe Checkout page for the chosen plan or scan pack. */
export const createCheckout = asyncHandler(async (req, res) => {
  const { product } = checkoutSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { id: true, email: true } });
  if (!user) throw Errors.unauthorized();
  const response: ApiResponse<{ url: string }> = {
    success: true,
    data: { url: await billingService.createCheckoutSession(user, product) },
  };
  res.status(200).json(response);
});

/** Android: RevenueCat calls this whenever a purchase, renewal, cancellation or expiry happens. */
export const revenueCatWebhook = asyncHandler(async (req, res) => {
  if (!billingService.isRevenueCatAuthorized(req.headers.authorization)) throw Errors.unauthorized("Invalid webhook secret");
  const result = await billingService.handleRevenueCatEvent(req.body?.event ?? {});
  res.status(200).json({ success: true, data: { result } });
});

/** Web: Stripe's webhook. It needs the raw body to check the signature, so it is mounted before the JSON parser. */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  if (!billingService.verifyStripeSignature(raw, req.headers["stripe-signature"] as string | undefined)) {
    throw Errors.unauthorized("Invalid webhook signature");
  }
  const result = await billingService.handleStripeEvent(JSON.parse(raw.toString()));
  res.status(200).json({ success: true, data: { result } });
});
