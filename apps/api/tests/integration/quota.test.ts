import request from "supertest";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { grantCredits, saveSubscription } from "../../src/services/quotaService";
import { resetDatabase } from "../helpers/db";
import { seedCatalog } from "../helpers/fixtures";

const recognize = vi.hoisted(() => vi.fn());
vi.mock("../../src/recognition/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/recognition/provider")>()),
  localRecognitionProvider: { recognize },
}));
const { RecognitionUnavailableError } = await import("../../src/recognition/provider");

const app = createApp();
const originalLimit = env.FREE_SCANS_PER_DAY;
const originalWelcome = env.WELCOME_SCAN_CREDITS;

const signUp = async (username: string) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${username}@example.com`, username, password: "Password1" });
  return { auth: `Bearer ${res.body.data.tokens.accessToken as string}`, id: res.body.data.user.id as string };
};

const photo = () =>
  sharp({ create: { width: 200, height: 280, channels: 3, background: { r: 90, g: 90, b: 200 } } }).jpeg().toBuffer();
const scan = async (auth: string) =>
  request(app).post("/api/scans").set("Authorization", auth).attach("image", await photo(), "card.jpg");
const quota = async (auth: string) => (await request(app).get("/api/quota").set("Authorization", auth)).body.data;

describe("scan quota", () => {
  beforeEach(async () => {
    await resetDatabase();
    const seed = await seedCatalog();
    env.FREE_SCANS_PER_DAY = 2;
    recognize.mockReset();
    recognize.mockResolvedValue({
      candidates: [
        { card: { id: seed.cards.charizard.id, name: "Charizard", number: "4", tcg: "pokemon", setId: seed.sets.base.id }, score: 0.9 },
      ],
      confidence: 0.8,
      cardFound: true,
      timings: { rectifyMs: 1, embedMs: 1, searchMs: 1 },
    });
  });
  afterEach(() => {
    env.FREE_SCANS_PER_DAY = originalLimit;
    env.WELCOME_SCAN_CREDITS = originalWelcome;
  });

  it("requires a signed-in user", async () => {
    expect((await request(app).get("/api/quota")).status).toBe(401);
  });

  it("starts with the daily free scans and counts them down", async () => {
    const { auth } = await signUp("ash");
    expect(await quota(auth)).toMatchObject({ premium: false, dailyLimit: 2, freeRemaining: 2, credits: 0 });

    expect((await scan(auth)).status).toBe(201);
    expect((await quota(auth)).freeRemaining).toBe(1);
  });

  it("refuses the scan after the free ones with 402 and the state the app needs to offer options", async () => {
    const { auth } = await signUp("ash");
    await scan(auth);
    await scan(auth);
    const res = await scan(auth);

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("QUOTA_EXCEEDED");
    expect(res.body.error.details).toMatchObject({ freeRemaining: 0, credits: 0, premium: false });
    expect(recognize).toHaveBeenCalledTimes(2);
  });

  it("spends credits from rewarded ads once the free scans are gone", async () => {
    const { auth, id } = await signUp("ash");
    await scan(auth);
    await scan(auth);
    await grantCredits(id, 2, "rewarded_ad", "ad-1");

    expect((await scan(auth)).status).toBe(201);
    expect((await quota(auth)).credits).toBe(1);
    expect((await scan(auth)).status).toBe(201);
    expect((await scan(auth)).status).toBe(402);
  });

  it("does not limit premium users, and stops when the subscription has ended", async () => {
    const { auth, id } = await signUp("ash");
    await saveSubscription(id, { status: "active", source: "revenuecat", expiresAt: new Date(Date.now() + 86_400_000) });

    for (let i = 0; i < 4; i++) expect((await scan(auth)).status).toBe(201);
    expect(await quota(auth)).toMatchObject({ premium: true, dailyLimit: null, freeRemaining: null });

    await saveSubscription(id, { status: "active", source: "revenuecat", expiresAt: new Date(Date.now() - 1000) });
    expect((await quota(auth)).premium).toBe(false);
  });

  it("keeps premium until the end date after the user cancels", async () => {
    const { auth, id } = await signUp("ash");
    await saveSubscription(id, { status: "canceled", source: "stripe", expiresAt: new Date(Date.now() + 86_400_000) });
    expect((await quota(auth)).premium).toBe(true);
  });

  it("gives the scan back when recognition fails", async () => {
    const { auth } = await signUp("ash");
    recognize.mockRejectedValueOnce(new RecognitionUnavailableError());

    expect((await scan(auth)).status).toBe(503);
    expect((await quota(auth)).freeRemaining).toBe(2);
  });

  it("cannot be overspent by scans sent at the same moment", async () => {
    const { auth } = await signUp("ash");
    env.FREE_SCANS_PER_DAY = 3;
    const results = await Promise.all(Array.from({ length: 8 }, () => scan(auth)));

    expect(results.filter((res) => res.status === 201)).toHaveLength(3);
    expect(results.filter((res) => res.status === 402)).toHaveLength(5);
    expect(await prisma.scanUsage.findFirstOrThrow()).toMatchObject({ used: 3 });
  });

  it("starts everyone with a few scans, once, and then each ad gives the next batch", async () => {
    env.FREE_SCANS_PER_DAY = 0;
    env.WELCOME_SCAN_CREDITS = 3;
    const { auth, id } = await signUp("ash");

    expect(await quota(auth)).toMatchObject({ premium: false, dailyLimit: null, credits: 3 });
    expect(await quota(auth)).toMatchObject({ credits: 3 });
    for (let i = 0; i < 3; i++) expect((await scan(auth)).status).toBe(201);
    expect((await scan(auth)).status).toBe(402);
    expect(await prisma.scanCredit.count({ where: { source: "welcome" } })).toBe(1);

    await grantCredits(id, 5, "rewarded_ad", "admob:next");
    for (let i = 0; i < 5; i++) expect((await scan(auth)).status).toBe(201);
    expect((await scan(auth)).status).toBe(402);
  });

  it("gives the starting scans to an account that existed before the limit, on its first use", async () => {
    env.FREE_SCANS_PER_DAY = 0;
    const { auth } = await signUp("ash");
    env.WELCOME_SCAN_CREDITS = 4;

    expect((await quota(auth)).credits).toBe(4);
  });

  it("keeps each user's scans separate", async () => {
    const ash = await signUp("ash");
    const misty = await signUp("misty");
    await scan(ash.auth);
    await scan(ash.auth);

    expect((await scan(ash.auth)).status).toBe(402);
    expect((await scan(misty.auth)).status).toBe(201);
  });

  it("does not count a credit grant twice when the same ad transaction arrives again", async () => {
    const { id } = await signUp("ash");
    expect(await grantCredits(id, 10, "rewarded_ad", "admob:t1")).toBe(true);
    expect(await grantCredits(id, 10, "rewarded_ad", "admob:t1")).toBe(false);
    expect((await prisma.scanCredit.aggregate({ _sum: { amount: true } }))._sum.amount).toBe(10);
  });
});
