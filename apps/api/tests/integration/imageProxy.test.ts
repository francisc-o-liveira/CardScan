import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { parseProxyTarget, proxyStorageKey } from "../../src/services/imageProxyService";

const app = createApp();
const SCRYFALL = "https://cards.scryfall.io/large/front/3/7/37d275d1-5ec7-4168-af2c-16b4e08aef08.jpg?1790133496";

describe("image proxy (/api/images)", () => {
  it("rejects a request without a url", async () => {
    expect((await request(app).get("/api/images")).status).toBe(400);
  });

  it("rejects hosts that are not on the allowlist, so it cannot fetch arbitrary addresses", async () => {
    for (const url of ["https://example.com/a.jpg", "http://localhost:4100/health", "https://cards.scryfall.io.evil.test/a.jpg"]) {
      const res = await request(app).get("/api/images").query({ url });
      expect(res.status, url).toBe(400);
    }
  });

  it("rejects plain http, even for an allowed host", async () => {
    const res = await request(app).get("/api/images").query({ url: SCRYFALL.replace("https:", "http:") });
    expect(res.status).toBe(400);
  });

  it("accepts an allowed https image URL", () => {
    expect(parseProxyTarget(SCRYFALL).hostname).toBe("cards.scryfall.io");
  });

  it("maps the same source URL to the same stored file, and different URLs to different files", () => {
    const first = proxyStorageKey(new URL(SCRYFALL));
    expect(first).toBe(proxyStorageKey(new URL(SCRYFALL)));
    expect(first).toMatch(/^proxy\/[0-9a-f]{40}\.jpg$/);
    expect(proxyStorageKey(new URL(SCRYFALL.replace("37d2", "38d2")))).not.toBe(first);
  });
});
