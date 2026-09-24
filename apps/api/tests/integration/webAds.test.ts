import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { getQuota } from "../../src/services/quotaService";
import { completeWebAd, startWebAd } from "../../src/services/webAdService";
import { resetDatabase } from "../helpers/db";

const app = createApp();
const saved = { ...env };

const signUp = async (username: string) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${username}@example.com`, username, password: "Password1" });
  return { auth: `Bearer ${res.body.data.tokens.accessToken as string}`, id: res.body.data.user.id as string };
};

const at = (start: Date, seconds: number) => new Date(start.getTime() + seconds * 1000);

describe("web rewarded ads", () => {
  beforeEach(async () => {
    await resetDatabase();
    env.WEB_AD_MIN_SECONDS = 15;
    env.WEB_ADS_PER_DAY = 2;
  });
  afterEach(() => Object.assign(env, saved));

  it("pays the scans once the session has run long enough, and only once", async () => {
    const { id } = await signUp("ash");
    const t0 = new Date();
    const { sessionId, minWatchSeconds } = await startWebAd(id, t0);

    expect(minWatchSeconds).toBe(15);
    await expect(completeWebAd(id, sessionId, at(t0, 5))).rejects.toMatchObject({ statusCode: 400 });
    expect(await completeWebAd(id, sessionId, at(t0, 16))).toBe(env.REWARDED_AD_CREDITS);
    await expect(completeWebAd(id, sessionId, at(t0, 17))).rejects.toMatchObject({ statusCode: 409 });
    expect((await getQuota(id)).credits).toBe(env.REWARDED_AD_CREDITS);
  });

  it("does not pay a session that is too old or belongs to someone else", async () => {
    const ash = await signUp("ash");
    const misty = await signUp("misty");
    const t0 = new Date();
    const { sessionId } = await startWebAd(ash.id, t0);

    await expect(completeWebAd(misty.id, sessionId, at(t0, 20))).rejects.toMatchObject({ statusCode: 404 });
    await expect(completeWebAd(ash.id, sessionId, at(t0, 11 * 60))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("stops after the daily number of ads", async () => {
    const { id } = await signUp("ash");
    const t0 = new Date();
    for (let i = 0; i < 2; i++) {
      const { sessionId } = await startWebAd(id, t0);
      await completeWebAd(id, sessionId, at(t0, 20));
    }

    await expect(startWebAd(id, at(t0, 30))).rejects.toMatchObject({ statusCode: 429 });
    expect((await getQuota(id)).webRewardedAd.remainingToday).toBe(0);
  });

  it("works through the API for a signed-in user, and refuses an early completion", async () => {
    const { auth } = await signUp("ash");
    const start = await request(app).post("/api/ads/web/start").set("Authorization", auth);
    expect(start.status).toBe(200);

    const early = await request(app).post("/api/ads/web/complete").set("Authorization", auth).send({ sessionId: start.body.data.sessionId });
    expect(early.status).toBe(400);

    env.WEB_AD_MIN_SECONDS = 0;
    const done = await request(app).post("/api/ads/web/complete").set("Authorization", auth).send({ sessionId: start.body.data.sessionId });
    expect(done.status).toBe(200);
    expect(done.body.data.credits).toBe(env.REWARDED_AD_CREDITS);
    expect((await request(app).post("/api/ads/web/start")).status).toBe(401);
  });
});
