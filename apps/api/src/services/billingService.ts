import crypto from "node:crypto";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { SCAN_PACKS, type ScanPackId } from "@cardscan/config";
import { grantCredits, revokeGrant, saveSubscription } from "./quotaService";

export type Plan = "monthly" | "yearly";
export type Product = Plan | ScanPackId;

const isPack = (product: string): product is ScanPackId => product in SCAN_PACKS;

/** Which pack a store product id is: `scans_25`, `scans_100` (Google Play ids may use `-` or a prefix). */
const packOfProduct = (productId?: string): ScanPackId | null => {
  const match = /scans[_-]?(25|100)(?![0-9])/i.exec(productId ?? "");
  return match ? (`scans_${match[1]}` as ScanPackId) : null;
};

// ---------------------------------------------------------------------------
// RevenueCat (Google Play on Android)
// ---------------------------------------------------------------------------

interface RevenueCatEvent {
  type?: string;
  /** Our user id: the app logs into RevenueCat with it. */
  app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  transaction_id?: string;
  original_transaction_id?: string;
}

const PLAN_OF_PRODUCT = (productId?: string): Plan | null =>
  /year|annual/i.test(productId ?? "") ? "yearly" : /month/i.test(productId ?? "") ? "monthly" : null;

/** Applies one RevenueCat webhook event. Returns what happened, for the response and the tests. */
export const handleRevenueCatEvent = async (event: RevenueCatEvent): Promise<"updated" | "ignored"> => {
  // A refunded scan pack is found through the purchase we credited, not through the event's user id, which
  // RevenueCat may report as an alias.
  if (event.type === "CANCELLATION" && packOfProduct(event.product_id)) {
    const transaction = event.transaction_id ?? event.original_transaction_id;
    return transaction && (await revokeGrant(`revenuecat:${transaction}`)) ? "updated" : "ignored";
  }

  const userId = event.app_user_id;
  if (!userId || !event.type) return "ignored";
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return "ignored";

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : undefined;
  const common = { source: "revenuecat" as const, plan: PLAN_OF_PRODUCT(event.product_id), externalId: event.transaction_id ?? null };

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
      await saveSubscription(userId, { ...common, status: "active", expiresAt });
      return "updated";
    case "NON_RENEWING_PURCHASE": {
      // A one-off scan pack: credits, once per store transaction. Not a subscription.
      const pack = packOfProduct(event.product_id);
      const transaction = event.transaction_id;
      if (!pack || !transaction) return "ignored";
      return (await grantCredits(userId, SCAN_PACKS[pack], "pack", `revenuecat:${transaction}`)) ? "updated" : "ignored";
    }
    case "CANCELLATION": {
      // Cancelled, but paid until the end of the period.
      await saveSubscription(userId, { ...common, status: "canceled", expiresAt });
      return "updated";
    }
    case "EXPIRATION":
      await saveSubscription(userId, { ...common, status: "expired", expiresAt: expiresAt ?? new Date() });
      return "updated";
    default:
      return "ignored";
  }
};

/** The webhook's shared secret, compared without leaking where it differs. */
export const isRevenueCatAuthorized = (header: string | undefined, secret = env.REVENUECAT_WEBHOOK_SECRET): boolean => {
  if (!secret || !header) return false;
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
};

// ---------------------------------------------------------------------------
// Stripe (the web app). Plain REST, so there is no SDK to keep up with.
// ---------------------------------------------------------------------------

const PRICES = (): Record<Product, string | undefined> => ({
  monthly: env.STRIPE_PRICE_MONTHLY,
  yearly: env.STRIPE_PRICE_YEARLY,
  scans_25: env.STRIPE_PRICE_SCANS_25,
  scans_100: env.STRIPE_PRICE_SCANS_100,
});

export interface HttpPost {
  post: (url: string, body: string, config: { headers: Record<string, string> }) => Promise<{ data: { url?: string } }>;
}

/** Starts a Stripe Checkout for the plan or pack and returns the page to send the user to. */
export const createCheckoutSession = async (
  user: { id: string; email: string },
  product: Product,
  http: HttpPost = axios,
): Promise<string> => {
  const price = PRICES()[product];
  if (!env.STRIPE_SECRET_KEY || !price) throw Errors.serviceUnavailable("Subscriptions are not set up on this server yet");

  const pack = isPack(product);
  const form = new URLSearchParams({
    mode: pack ? "payment" : "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    customer_email: user.email,
    ...(pack
      ? { "metadata[userId]": user.id, "metadata[pack]": product }
      : { "subscription_data[metadata][userId]": user.id }),
    success_url: `${env.WEB_PUBLIC_URL}/premium?status=success`,
    cancel_url: `${env.WEB_PUBLIC_URL}/premium?status=canceled`,
  });
  const { data } = await http.post("https://api.stripe.com/v1/checkout/sessions", form.toString(), {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!data.url) throw Errors.serviceUnavailable("Could not start the checkout");
  return data.url;
};

/** Checks the `Stripe-Signature` header (HMAC-SHA256 of `timestamp.payload`), within a 5 minute window. */
export const verifyStripeSignature = (
  payload: Buffer | string,
  header: string | undefined,
  secret = env.STRIPE_WEBHOOK_SECRET,
  now = Date.now(),
): boolean => {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=") as [string, string]));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload.toString()}`).digest("hex");
  const given = Buffer.from(parts.v1 ?? "");
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
};

interface StripeSubscription {
  id?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: { userId?: string };
  items?: { data?: { current_period_end?: number; price?: { id?: string } }[] };
}

interface StripeCheckoutSession {
  id?: string;
  mode?: string;
  payment_status?: string;
  payment_intent?: string;
  metadata?: { userId?: string; pack?: string };
}

/** A paid checkout of a scan pack adds its scans, once per session. */
const handlePackCheckout = async (session: StripeCheckoutSession): Promise<"updated" | "ignored"> => {
  const { userId, pack } = session.metadata ?? {};
  if (session.mode !== "payment" || session.payment_status !== "paid" || !session.id) return "ignored";
  if (!userId || !pack || !isPack(pack)) return "ignored";
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return "ignored";
  // Keyed by the payment, which is what a later refund refers to.
  return (await grantCredits(userId, SCAN_PACKS[pack], "pack", `stripe:${session.payment_intent ?? session.id}`)) ? "updated" : "ignored";
};

/** Applies a Stripe event: a subscription created, updated or deleted, or a paid scan pack. */
export const handleStripeEvent = async (event: { type?: string; data?: { object?: StripeSubscription & StripeCheckoutSession & { refunded?: boolean } } }): Promise<"updated" | "ignored"> => {
  // A fully refunded payment takes the scans of its pack back.
  if (event.type === "charge.refunded") {
    const charge = event.data?.object;
    return charge?.refunded === true && charge.payment_intent && (await revokeGrant(`stripe:${charge.payment_intent}`)) ? "updated" : "ignored";
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    return event.data?.object ? handlePackCheckout(event.data.object) : "ignored";
  }
  if (!event.type?.startsWith("customer.subscription.")) return "ignored";
  const subscription = event.data?.object;
  const userId = subscription?.metadata?.userId;
  if (!subscription || !userId) return "ignored";
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return "ignored";

  // Newer Stripe API versions keep the period end on the subscription items.
  const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const common = {
    source: "stripe" as const,
    externalId: subscription.id ?? null,
    plan: priceId === env.STRIPE_PRICE_YEARLY ? "yearly" : priceId === env.STRIPE_PRICE_MONTHLY ? "monthly" : null,
    expiresAt: periodEnd ? new Date(periodEnd * 1000) : undefined,
  };

  if (event.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(subscription.status ?? "")) {
    await saveSubscription(userId, { ...common, status: "expired", expiresAt: common.expiresAt ?? new Date() });
  } else if (["active", "trialing", "past_due"].includes(subscription.status ?? "")) {
    await saveSubscription(userId, { ...common, status: subscription.cancel_at_period_end ? "canceled" : "active" });
  } else {
    return "ignored";
  }
  return "updated";
};
