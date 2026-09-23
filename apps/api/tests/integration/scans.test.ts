import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { resetDatabase } from "../helpers/db";
import { seedCatalog } from "../helpers/fixtures";

// Recognition itself is measured by scripts/evaluateRecognition.ts; here it is replaced so the tests cover
// the API around it (auth, uploads, storage, history, feedback) without a model or an index.
const recognize = vi.hoisted(() => vi.fn());
vi.mock("../../src/recognition/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/recognition/provider")>()),
  localRecognitionProvider: { recognize },
}));
const { RecognitionUnavailableError } = await import("../../src/recognition/provider");

const app = createApp();
let seed: Awaited<ReturnType<typeof seedCatalog>>;

const signUp = async (username: string) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${username}@example.com`, username, password: "Password1" });
  return `Bearer ${res.body.data.tokens.accessToken as string}`;
};

const photo = () =>
  sharp({ create: { width: 300, height: 420, channels: 3, background: { r: 200, g: 60, b: 40 } } }).jpeg().toBuffer();

const scan = async (auth: string) =>
  request(app).post("/api/scans").set("Authorization", auth).attach("image", await photo(), "card.jpg");

const indexed = (card: { id: string; name: string; collectorNumber: string; setId: string }) => ({
  id: card.id,
  name: card.name,
  number: card.collectorNumber,
  tcg: "pokemon",
  setId: card.setId,
});

describe("scans API", () => {
  beforeEach(async () => {
    await resetDatabase();
    seed = await seedCatalog();
    recognize.mockReset();
    recognize.mockResolvedValue({
      candidates: [
        { card: indexed(seed.cards.charizard), score: 0.91 },
        { card: indexed(seed.cards.alakazam), score: 0.83 },
      ],
      confidence: 0.72,
      cardFound: true,
      timings: { rectifyMs: 1, embedMs: 1, searchMs: 1 },
    });
  });

  it("requires a signed-in user", async () => {
    expect((await request(app).post("/api/scans")).status).toBe(401);
    expect((await request(app).get("/api/scans")).status).toBe(401);
  });

  it("rejects a request without a photo, or with a file that is not an image", async () => {
    const auth = await signUp("ash");
    expect((await request(app).post("/api/scans").set("Authorization", auth)).status).toBe(400);
    const notImage = await request(app)
      .post("/api/scans")
      .set("Authorization", auth)
      .attach("image", Buffer.from("not an image"), { filename: "card.jpg", contentType: "image/jpeg" });
    expect(notImage.status).toBe(400);
    expect(recognize).not.toHaveBeenCalled();
  });

  it("stores the photo and returns the ranked candidates with their set and game", async () => {
    const res = await scan(await signUp("ash"));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "completed", confidence: 0.72, cardFound: true, selectedCard: null });
    expect(res.body.data.candidates.map((c: { card: { name: string } }) => c.card.name)).toEqual(["Charizard", "Alakazam"]);
    expect(res.body.data.candidates[0].card.set.name).toBeDefined();
    expect(res.body.data.candidates[0].card.tcg.slug).toBe("pokemon");

    expect(res.body.data.imageUrl).toBe(`http://api.test/assets/scans/${res.body.data.id}.jpg`);
    const stored = await fs.readFile(path.join(env.ASSETS_DIR, "scans", `${res.body.data.id}.jpg`));
    expect((await sharp(stored).metadata()).format).toBe("jpeg");
  });

  it("answers 503 while the recognition index has not been built, and keeps it out of the history", async () => {
    recognize.mockRejectedValue(new RecognitionUnavailableError());
    const auth = await signUp("ash");

    const res = await scan(auth);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect((await request(app).get("/api/scans").set("Authorization", auth)).body.data).toEqual([]);
  });

  it("lists only the user's own scans, newest first", async () => {
    const ash = await signUp("ash");
    const misty = await signUp("misty");
    const first = await scan(ash);
    const second = await scan(ash);
    await scan(misty);

    const res = await request(app).get("/api/scans").set("Authorization", ash);
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([second.body.data.id, first.body.data.id]);
  });

  it("records the confirmed card and keeps the correction as feedback", async () => {
    const auth = await signUp("ash");
    const { id } = (await scan(auth)).body.data;

    const res = await request(app)
      .post(`/api/scans/${id}/confirm`)
      .set("Authorization", auth)
      .send({ cardId: seed.cards.alakazam.id });

    expect(res.status).toBe(200);
    expect(res.body.data.selectedCard.name).toBe("Alakazam");
    const feedback = await prisma.recognitionFeedback.findMany({ where: { scanId: id } });
    expect(feedback).toEqual([
      expect.objectContaining({
        predictedCardId: seed.cards.charizard.id,
        actualCardId: seed.cards.alakazam.id,
        confidence: 0.72,
      }),
    ]);
  });

  it("does not let a user read or confirm someone else's scan", async () => {
    const { id } = (await scan(await signUp("ash"))).body.data;
    const misty = await signUp("misty");

    expect((await request(app).get(`/api/scans/${id}`).set("Authorization", misty)).status).toBe(404);
    const confirm = await request(app)
      .post(`/api/scans/${id}/confirm`)
      .set("Authorization", misty)
      .send({ cardId: seed.cards.charizard.id });
    expect(confirm.status).toBe(404);
  });

  it("rejects confirming a card that does not exist", async () => {
    const auth = await signUp("ash");
    const { id } = (await scan(auth)).body.data;
    const res = await request(app)
      .post(`/api/scans/${id}/confirm`)
      .set("Authorization", auth)
      .send({ cardId: "00000000-0000-4000-8000-000000000000" });
    expect(res.status).toBe(404);
  });
});
