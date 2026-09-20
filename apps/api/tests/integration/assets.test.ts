import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { createLocalImageStorage } from "../../src/storage/imageStorage";

const app = createApp();
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe("re-hosted card images (/assets)", () => {
  beforeAll(async () => {
    await fs.mkdir(path.join(env.ASSETS_DIR, "yugioh/cards"), { recursive: true });
    await fs.writeFile(path.join(env.ASSETS_DIR, "yugioh/cards/123.jpg"), JPEG_MAGIC);
  });
  afterAll(async () => {
    await fs.rm(env.ASSETS_DIR, { recursive: true, force: true });
  });

  it("serves a stored image with long-lived caching", async () => {
    const res = await request(app).get("/assets/yugioh/cards/123.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["cache-control"]).toMatch(/max-age=2592000/);
    expect(Buffer.compare(res.body as Buffer, JPEG_MAGIC)).toBe(0);
  });

  it("allows other origins (the web app) to display the image", async () => {
    // Helmet defaults to same-origin, which would blank every re-hosted image in the browser.
    const res = await request(app).get("/assets/yugioh/cards/123.jpg").set("Origin", "http://localhost:3000");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("returns 404 for a missing image", async () => {
    expect((await request(app).get("/assets/yugioh/cards/999.jpg")).status).toBe(404);
  });

  it("does not let requests escape the assets directory", async () => {
    const res = await request(app).get("/assets/..%2F..%2Fpackage.json");
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("@cardscan/api");
  });
});

describe("local image storage", () => {
  it("round-trips a file and builds a public URL", async () => {
    const root = await fs.mkdtemp(path.join(env.ASSETS_DIR, "..", "storage-test-"));
    try {
      const storage = createLocalImageStorage(root, "http://api.test/");
      expect(await storage.exists("a/b.jpg")).toBe(false);
      await storage.put("a/b.jpg", JPEG_MAGIC);
      expect(await storage.exists("a/b.jpg")).toBe(true);
      expect(storage.publicUrl("a/b.jpg")).toBe("http://api.test/assets/a/b.jpg");
      expect((await fs.readdir(path.join(root, "a"))).some((f) => f.endsWith(".tmp"))).toBe(false);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects keys that try to escape the root", async () => {
    const storage = createLocalImageStorage("/tmp/x", "http://api.test");
    await expect(storage.put("../evil.jpg", JPEG_MAGIC)).rejects.toThrow(/Unsafe/);
    await expect(storage.exists("/etc/passwd")).rejects.toThrow(/Unsafe/);
    expect(() => storage.publicUrl("../x")).toThrow(/Unsafe/);
  });
});
