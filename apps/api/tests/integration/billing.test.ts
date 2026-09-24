import crypto from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { grantForRewardedAd, verifySsvSignature } from "../../src/services/adRewardService";
import { createCheckoutSession, verifyStripeSignature } from "../../src/services/billingService";
import { getQuota, grantCredits } from "../../src/services/quotaService";
import { resetDatabase } from "../helpers/db";

const app = createApp();
const saved = { ...env };

const signUp = async (username: string) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${username}@example.com`, username, password: "Password1" });
  return { auth: `Bearer ${res.body.data.tokens.accessToken as string}`, id: res.body.data.user.id as string };
};

describe("billing and rewarded ads", () => {
  beforeEach(async () => {
    await resetDatabase();
    env.REVENUECAT_WEBHOOK_SECRET = "rc-secret";
    env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    env.STRIPE_SECRET_KEY = "sk_test";
    env.STRIPE_PRICE_MONTHLY = "price_month";
    env.STRIPE_PRICE_YEARLY = "price_year";
    env.STRIPE_PRICE_SCANS_25 = "price_25";
    env.REWARDED_ADS_PER_DAY = 2;
  });
  afterEach(() => Object.assign(env, saved));

  describe("RevenueCat webhook", () => {
    const send = (event: object, secret = "rc-secret") =>
      request(app).post("/api/billing/revenuecat").set("Authorization", `Bearer ${secret}`).send({ event });

    it("rejects a call without the shared secret", async () => {
      expect((await send({ type: "RENEWAL" }, "wrong")).status).toBe(401);
    });

    it("turns purchase, cancellation and expiry into premium access", async () => {
      const { id } = await signUp("ash");
      const inAMonth = Date.now() + 30 * 86_400_000;

      await send({ type: "INITIAL_PURCHASE", app_user_id: id, product_id: "premium_monthly", expiration_at_ms: inAMonth });
      expect(await getQuota(id)).toMatchObject({ premium: true });
      expect((await prisma.subscription.findUniqueOrThrow({ where: { userId: id } })).plan).toBe("monthly");

      await send({ type: "CANCELLATION", app_user_id: id, product_id: "premium_monthly", expiration_at_ms: inAMonth });
      expect((await getQuota(id)).premium).toBe(true);

      await send({ type: "EXPIRATION", app_user_id: id, product_id: "premium_monthly", expiration_at_ms: Date.now() - 1000 });
      expect((await getQuota(id)).premium).toBe(false);
    });

    it("adds the scans of a pack once per store transaction, without making the user premium", async () => {
      const { id } = await signUp("ash");
      const purchase = { type: "NON_RENEWING_PURCHASE", app_user_id: id, product_id: "scans_25", transaction_id: "GPA.1" };

      expect((await send(purchase)).body.data.result).toBe("updated");
      expect((await send(purchase)).body.data.result).toBe("ignored");
      expect(await getQuota(id)).toMatchObject({ credits: 25, premium: false });
    });

    it("takes the scans of a refunded pack back, once, and leaves the subscription alone", async () => {
      const { id } = await signUp("ash");
      await send({ type: "INITIAL_PURCHASE", app_user_id: id, product_id: "premium_monthly", expiration_at_ms: Date.now() + 86_400_000 });
      await send({ type: "NON_RENEWING_PURCHASE", app_user_id: id, product_id: "scans_25", transaction_id: "GPA.9" });
      expect((await getQuota(id)).credits).toBe(25);

      const refund = { type: "CANCELLATION", app_user_id: id, product_id: "scans_25", transaction_id: "GPA.9" };
      expect((await send(refund)).body.data.result).toBe("updated");
      expect((await send(refund)).body.data.result).toBe("ignored");
      expect(await getQuota(id)).toMatchObject({ credits: 0, premium: true });
    });

    it("finds the user of a refunded pack through the purchase, whatever user id the event carries", async () => {
      const { id } = await signUp("ash");
      await send({ type: "NON_RENEWING_PURCHASE", app_user_id: id, product_id: "scans_100", transaction_id: "GPA.5" });

      const refund = await send({ type: "CANCELLATION", app_user_id: "$RCAnonymousID:abc", product_id: "scans_100", transaction_id: "GPA.5" });
      expect(refund.body.data.result).toBe("updated");
      expect((await getQuota(id)).credits).toBe(0);
    });

    it("leaves the user in debt when the refunded scans were already spent, and pays it off from later grants", async () => {
      const { id } = await signUp("ash");
      await send({ type: "NON_RENEWING_PURCHASE", app_user_id: id, product_id: "scans_25", transaction_id: "GPA.7" });
      await prisma.scanCredit.create({ data: { userId: id, amount: -20, source: "scan" } });
      await send({ type: "CANCELLATION", app_user_id: id, product_id: "scans_25", transaction_id: "GPA.7" });

      expect((await getQuota(id)).credits).toBe(0);
      await grantCredits(id, 5, "rewarded_ad", "admob:x");
      expect((await getQuota(id)).credits).toBe(0);
      await grantCredits(id, 100, "pack", "later");
      expect((await getQuota(id)).credits).toBe(85);
    });

    it("ignores a one-off purchase that is not a scan pack", async () => {
      const { id } = await signUp("ash");
      const res = await send({ type: "NON_RENEWING_PURCHASE", app_user_id: id, product_id: "something_else", transaction_id: "t" });
      expect(res.body.data.result).toBe("ignored");
      expect((await getQuota(id)).credits).toBe(0);
    });

    it("ignores users it does not know and events it does not use", async () => {
      expect((await send({ type: "INITIAL_PURCHASE", app_user_id: "nobody" })).body.data.result).toBe("ignored");
      const { id } = await signUp("ash");
      expect((await send({ type: "TEST", app_user_id: id })).body.data.result).toBe("ignored");
    });
  });

  describe("Stripe", () => {
    const sign = (payload: string, secret = "whsec_test", t = Math.floor(Date.now() / 1000)) =>
      `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

    it("accepts a valid signature and refuses a wrong, stale or missing one", () => {
      const payload = '{"type":"x"}';
      expect(verifyStripeSignature(payload, sign(payload))).toBe(true);
      expect(verifyStripeSignature(payload, sign(payload, "other"))).toBe(false);
      expect(verifyStripeSignature(payload, sign(payload, "whsec_test", 1000))).toBe(false);
      expect(verifyStripeSignature(payload, undefined)).toBe(false);
    });

    it("activates premium from a subscription event, with the period end and the plan", async () => {
      const { id } = await signUp("ash");
      const payload = JSON.stringify({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            status: "active",
            metadata: { userId: id },
            items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86_400, price: { id: "price_year" } }] },
          },
        },
      });
      const res = await request(app)
        .post("/api/billing/stripe/webhook")
        .set("Stripe-Signature", sign(payload))
        .set("Content-Type", "application/json")
        .send(payload);

      expect(res.status).toBe(200);
      expect(await getQuota(id)).toMatchObject({ premium: true });
      expect((await prisma.subscription.findUniqueOrThrow({ where: { userId: id } })).plan).toBe("yearly");
    });

    it("adds the scans of a paid pack checkout once, and nothing for an unpaid one", async () => {
      const { id } = await signUp("ash");
      const event = (paymentStatus: string) =>
        JSON.stringify({
          type: "checkout.session.completed",
          data: { object: { id: "cs_1", mode: "payment", payment_status: paymentStatus, metadata: { userId: id, pack: "scans_100" } } },
        });
      const post = (payload: string) =>
        request(app)
          .post("/api/billing/stripe/webhook")
          .set("Stripe-Signature", sign(payload))
          .set("Content-Type", "application/json")
          .send(payload);

      expect((await post(event("unpaid"))).body.data.result).toBe("ignored");
      expect((await post(event("paid"))).body.data.result).toBe("updated");
      expect((await post(event("paid"))).body.data.result).toBe("ignored");
      expect((await getQuota(id)).credits).toBe(100);
    });

    it("takes the scans of a fully refunded payment back, but not for a partial refund", async () => {
      const { id } = await signUp("ash");
      const post = (payload: object) => {
        const body = JSON.stringify(payload);
        return request(app)
          .post("/api/billing/stripe/webhook")
          .set("Stripe-Signature", sign(body))
          .set("Content-Type", "application/json")
          .send(body);
      };
      await post({
        type: "checkout.session.completed",
        data: { object: { id: "cs_2", mode: "payment", payment_status: "paid", payment_intent: "pi_1", metadata: { userId: id, pack: "scans_25" } } },
      });
      expect((await getQuota(id)).credits).toBe(25);

      expect((await post({ type: "charge.refunded", data: { object: { payment_intent: "pi_1", refunded: false } } })).body.data.result).toBe("ignored");
      expect((await getQuota(id)).credits).toBe(25);
      expect((await post({ type: "charge.refunded", data: { object: { payment_intent: "pi_1", refunded: true } } })).body.data.result).toBe("updated");
      expect((await post({ type: "charge.refunded", data: { object: { payment_intent: "pi_1", refunded: true } } })).body.data.result).toBe("ignored");
      expect((await getQuota(id)).credits).toBe(0);
    });

    it("starts a one-off payment checkout for a pack", async () => {
      let body = "";
      await createCheckoutSession({ id: "u1", email: "a@b.c" }, "scans_25", {
        post: async (_url, form) => {
          body = form;
          return { data: { url: "https://checkout.stripe.com/c/pay/cs_pack" } };
        },
      });
      const form = new URLSearchParams(body);
      expect(form.get("mode")).toBe("payment");
      expect(form.get("line_items[0][price]")).toBe("price_25");
      expect(form.get("metadata[pack]")).toBe("scans_25");
      expect(form.get("metadata[userId]")).toBe("u1");
    });

    it("rejects the webhook without a valid signature", async () => {
      const res = await request(app)
        .post("/api/billing/stripe/webhook")
        .set("Stripe-Signature", "t=1,v1=bad")
        .set("Content-Type", "application/json")
        .send("{}");
      expect(res.status).toBe(401);
    });

    it("starts a checkout for the chosen plan and returns Stripe's page", async () => {
      let sent: { url: string; body: string } | null = null;
      const url = await createCheckoutSession({ id: "u1", email: "a@b.c" }, "yearly", {
        post: async (target, body) => {
          sent = { url: target, body };
          return { data: { url: "https://checkout.stripe.com/c/pay/cs_test" } };
        },
      });

      expect(url).toBe("https://checkout.stripe.com/c/pay/cs_test");
      expect(sent!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
      const form = new URLSearchParams(sent!.body);
      expect(form.get("line_items[0][price]")).toBe("price_year");
      expect(form.get("client_reference_id")).toBe("u1");
    });

    it("says subscriptions are not set up when Stripe is not configured", async () => {
      env.STRIPE_SECRET_KEY = undefined;
      const { auth } = await signUp("ash");
      const res = await request(app).post("/api/billing/checkout").set("Authorization", auth).send({ product: "monthly" });
      expect(res.status).toBe(503);
    });
  });

  describe("rewarded ad verification", () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const keys = [{ keyId: 3335741209, pem: publicKey.export({ type: "spki", format: "pem" }).toString() }];
    const webSafe = (buffer: Buffer) => buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    /** A callback query as AdMob builds it: parameters, then `signature` and `key_id` last. */
    const callback = (params: Record<string, string>, signWith = privateKey) => {
      const message = new URLSearchParams(params).toString();
      const signature = webSafe(crypto.sign("sha256", Buffer.from(message), signWith));
      return `${message}&signature=${signature}&key_id=3335741209`;
    };

    it("accepts a callback signed by Google's key and refuses a forged or altered one", () => {
      const query = callback({ ad_unit: "u", transaction_id: "t1", user_id: "x" });
      expect(verifySsvSignature(query, keys)).toBe(true);

      const forged = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
      expect(verifySsvSignature(callback({ user_id: "x" }, forged), keys)).toBe(false);
      expect(verifySsvSignature(query.replace("user_id=x", "user_id=y"), keys)).toBe(false);
      expect(verifySsvSignature("user_id=x", keys)).toBe(false);
    });

    it("adds the configured credits once per ad, and no more than the daily cap of ads", async () => {
      const { id } = await signUp("ash");
      const params = (transaction: string) => new URLSearchParams({ user_id: id, transaction_id: transaction, ad_unit: "u" });

      expect(await grantForRewardedAd(params("t1"))).toBe("granted");
      expect(await grantForRewardedAd(params("t1"))).toBe("duplicate");
      expect(await grantForRewardedAd(params("t2"))).toBe("granted");
      expect(await grantForRewardedAd(params("t3"))).toBe("capped");
      expect((await getQuota(id)).credits).toBe(2 * env.REWARDED_AD_CREDITS);
    });

    it("ignores callbacks for another ad unit or an unknown user", async () => {
      const { id } = await signUp("ash");
      env.ADMOB_REWARDED_AD_UNIT_ID = "mine";
      expect(await grantForRewardedAd(new URLSearchParams({ user_id: id, transaction_id: "t", ad_unit: "theirs" }))).toBe("ignored");
      env.ADMOB_REWARDED_AD_UNIT_ID = undefined;
      expect(await grantForRewardedAd(new URLSearchParams({ user_id: "nobody", transaction_id: "t" }))).toBe("ignored");
    });
  });
});
