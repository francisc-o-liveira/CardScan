import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthRateLimiter } from "../../src/middleware/rateLimiter";

describe("auth rate limiter", () => {
  it("allows up to the limit, then answers 429 in the standard error envelope", async () => {
    const app = express();
    app.post("/login", createAuthRateLimiter(3), (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      expect((await request(app).post("/login")).status).toBe(200);
    }
    const blocked = await request(app).post("/login");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, error: { code: "RATE_LIMITED" } });
    expect(blocked.headers["ratelimit-limit"] ?? blocked.headers["ratelimit"]).toBeDefined();
  });
});
