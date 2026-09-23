import request from "supertest";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { resetDatabase } from "../helpers/db";
import { seedCatalog } from "../helpers/fixtures";

// Only used by the "add from a scan" test; recognition itself is covered by scans.test.ts.
const recognize = vi.hoisted(() => vi.fn());
vi.mock("../../src/recognition/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/recognition/provider")>()),
  localRecognitionProvider: { recognize },
}));

const app = createApp();
let seed: Awaited<ReturnType<typeof seedCatalog>>;

const signUp = async (username: string) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${username}@example.com`, username, password: "Password1" });
  return `Bearer ${res.body.data.tokens.accessToken as string}`;
};

const add = (auth: string, body: object) => request(app).post("/api/collection/items").set("Authorization", auth).send(body);
const list = (auth: string, query = "") => request(app).get(`/api/collection${query}`).set("Authorization", auth);
const summary = async (auth: string) =>
  (await request(app).get("/api/collection/summary").set("Authorization", auth)).body.data;

describe("collection API", () => {
  beforeEach(async () => {
    await resetDatabase();
    seed = await seedCatalog();
  });

  it("requires a signed-in user", async () => {
    expect((await request(app).get("/api/collection")).status).toBe(401);
    expect((await request(app).post("/api/collection/items").send({ cardId: seed.cards.charizard.id })).status).toBe(401);
  });

  it("starts empty", async () => {
    const auth = await signUp("ash");
    expect((await list(auth)).body.data.data).toEqual([]);
    expect(await summary(auth)).toEqual({ totalCards: 0, uniqueCards: 0, totalSets: 0, perGame: {}, scans: 0 });
  });

  it("adds a card as one Near Mint English copy by default, with its set and game", async () => {
    const auth = await signUp("ash");
    const res = await add(auth, { cardId: seed.cards.charizard.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      quantity: 1,
      card: { name: "Charizard", set: { name: "Base Set" }, tcg: { slug: "pokemon" } },
      items: [{ quantity: 1, condition: "NM", language: "en" }],
    });
  });

  it("adds to the existing copies instead of creating a duplicate row", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id });
    const res = await add(auth, { cardId: seed.cards.charizard.id, quantity: 2 });

    expect(res.body.data.quantity).toBe(3);
    expect(res.body.data.items).toHaveLength(1);
    expect(await prisma.collectionItem.count()).toBe(1);
  });

  it("does not create duplicate rows when the same card is added at the same time", async () => {
    const auth = await signUp("ash");
    const results = await Promise.all(
      Array.from({ length: 8 }, () => add(auth, { cardId: seed.cards.charizard.id })),
    );

    expect(results.map((res) => res.status)).toEqual(Array(8).fill(201));
    expect(await prisma.collectionItem.count()).toBe(1);
    expect((await prisma.collectionItem.findFirstOrThrow()).quantity).toBe(8);
  });

  it("keeps different conditions and languages as separate groups of the same card", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id });
    await add(auth, { cardId: seed.cards.charizard.id, condition: "LP" });
    const res = await add(auth, { cardId: seed.cards.charizard.id, language: "ja" });

    expect(res.body.data.quantity).toBe(3);
    expect(res.body.data.items.map((i: { condition: string; language: string }) => `${i.condition}/${i.language}`)).toEqual([
      "NM/en",
      "LP/en",
      "NM/ja",
    ]);
  });

  it("rejects unknown cards and invalid input", async () => {
    const auth = await signUp("ash");
    expect((await add(auth, { cardId: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
    expect((await add(auth, { cardId: seed.cards.charizard.id, quantity: 0 })).status).toBe(400);
    expect((await add(auth, { cardId: seed.cards.charizard.id, condition: "MINT" })).status).toBe(400);
  });

  it("lists owned cards with search, game and condition filters, and pagination", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id, quantity: 2 });
    await add(auth, { cardId: seed.cards.alakazam.id, condition: "HP" });
    await add(auth, { cardId: seed.cards.lotus.id });

    const names = async (query: string) =>
      (await list(auth, query)).body.data.data.map((e: { card: { name: string } }) => e.card.name);

    expect(await names("")).toEqual(["Alakazam", "Black Lotus", "Charizard"]);
    expect(await names("?tcg=magic")).toEqual(["Black Lotus"]);
    expect(await names("?query=char")).toEqual(["Charizard"]);
    expect(await names("?condition=HP")).toEqual(["Alakazam"]);

    const page = (await list(auth, "?limit=2&page=2")).body.data;
    expect(page.data.map((e: { card: { name: string } }) => e.card.name)).toEqual(["Charizard"]);
    expect(page.pagination).toMatchObject({ total: 3, totalPages: 2 });
  });

  it("summarises copies, distinct cards, sets and games", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id, quantity: 2 });
    await add(auth, { cardId: seed.cards.alakazam.id });
    await add(auth, { cardId: seed.cards.lotus.id });

    expect(await summary(auth)).toEqual({
      totalCards: 4,
      uniqueCards: 3,
      totalSets: 2,
      perGame: { pokemon: 3, magic: 1 },
      scans: 0,
    });
  });

  it("updates a group, merges it into another when it moves to the same condition, and removes it at 0", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id, quantity: 2 });
    const lp = (await add(auth, { cardId: seed.cards.charizard.id, condition: "LP" })).body.data.items[1];

    const patch = (id: string, body: object) =>
      request(app).patch(`/api/collection/items/${id}`).set("Authorization", auth).send(body);

    const merged = await patch(lp.id, { condition: "NM" });
    expect(merged.body.data.items).toEqual([expect.objectContaining({ condition: "NM", quantity: 3 })]);

    const [nm] = merged.body.data.items;
    expect((await patch(nm.id, { quantity: 5 })).body.data.quantity).toBe(5);
    expect((await patch(nm.id, { quantity: 0 })).body.data).toBeNull();
    expect(await prisma.collectionItem.count()).toBe(0);
  });

  it("reports how many copies the user owns of the cards being displayed", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id, quantity: 2 });
    await add(auth, { cardId: seed.cards.charizard.id, condition: "LP" });
    const ids = [seed.cards.charizard.id, seed.cards.alakazam.id].join(",");

    const res = await request(app).get(`/api/collection/owned?cardIds=${ids}`).set("Authorization", auth);
    expect(res.body.data).toEqual({ [seed.cards.charizard.id]: 3 });
    expect((await request(app).get("/api/collection/owned").set("Authorization", auth)).status).toBe(400);
    expect((await request(app).get("/api/collection/owned?cardIds=not-an-id").set("Authorization", auth)).status).toBe(400);
  });

  it("returns the user's copies of one card, or null", async () => {
    const auth = await signUp("ash");
    await add(auth, { cardId: seed.cards.charizard.id });
    const owned = await request(app).get(`/api/collection/cards/${seed.cards.charizard.id}`).set("Authorization", auth);
    const notOwned = await request(app).get(`/api/collection/cards/${seed.cards.lotus.id}`).set("Authorization", auth);

    expect(owned.body.data.quantity).toBe(1);
    expect(notOwned.body.data).toBeNull();
  });

  it("keeps collections separate: nobody can see, change or remove another user's copies", async () => {
    const ash = await signUp("ash");
    const misty = await signUp("misty");
    const item = (await add(ash, { cardId: seed.cards.charizard.id })).body.data.items[0];

    expect((await list(misty)).body.data.data).toEqual([]);
    expect(
      (await request(app).patch(`/api/collection/items/${item.id}`).set("Authorization", misty).send({ quantity: 9 })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/collection/items/${item.id}`).set("Authorization", misty)).status).toBe(404);
    expect((await list(ash)).body.data.data[0].quantity).toBe(1);
  });

  it("adding from a scan also confirms the scan and counts it", async () => {
    const auth = await signUp("ash");
    recognize.mockResolvedValue({
      candidates: [
        {
          card: { id: seed.cards.alakazam.id, name: "Alakazam", number: "1", tcg: "pokemon", setId: seed.sets.base.id },
          score: 0.9,
        },
      ],
      confidence: 0.5,
      cardFound: true,
      timings: { rectifyMs: 1, embedMs: 1, searchMs: 1 },
    });
    const photo = await sharp({ create: { width: 60, height: 84, channels: 3, background: "#c33" } }).jpeg().toBuffer();
    const scanId = (await request(app).post("/api/scans").set("Authorization", auth).attach("image", photo, "card.jpg"))
      .body.data.id;

    // The user corrects the scan: it was Charizard, not the predicted Alakazam.
    const res = await add(auth, { cardId: seed.cards.charizard.id, scanId });

    expect(res.status).toBe(201);
    const scan = await prisma.scan.findUniqueOrThrow({ where: { id: scanId } });
    expect(scan.selectedCardId).toBe(seed.cards.charizard.id);
    expect(await prisma.recognitionFeedback.findFirst({ where: { scanId } })).toMatchObject({
      predictedCardId: seed.cards.alakazam.id,
      actualCardId: seed.cards.charizard.id,
    });
    expect((await summary(auth)).scans).toBe(1);
  });

  it("rejects a scan id that belongs to someone else, without adding the card", async () => {
    const ash = await signUp("ash");
    const misty = await signUp("misty");
    const scan = await prisma.scan.create({
      data: { userId: (await prisma.user.findFirstOrThrow({ where: { username: "misty" } })).id, imageUrl: "x", status: "COMPLETED" },
    });

    expect((await add(ash, { cardId: seed.cards.charizard.id, scanId: scan.id })).status).toBe(404);
    expect(await prisma.collectionItem.count()).toBe(0);
    void misty;
  });
});
