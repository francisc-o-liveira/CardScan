import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { generateOpaqueToken } from "../../src/utils/opaqueToken";
import { resetDatabase } from "../helpers/db";

const app = createApp();
const credentials = { email: "ada@example.com", username: "ada_l", password: "Password1" };

const register = (body: object = credentials, headers: Record<string, string> = {}) =>
  request(app).post("/api/auth/register").set(headers).send(body);

const refreshCookie = (res: request.Response): string | undefined => {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith("cardscan_refresh_token="));
};

/** "name=value" part only, as a browser would send it back. */
const cookiePair = (res: request.Response) => refreshCookie(res)!.split(";")[0]!;

const createResetToken = async (expiresInMs: number) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
  const { token, tokenHash } = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + expiresInMs) },
  });
  return token;
};

describe("auth API", () => {
  beforeEach(resetDatabase);

  describe("POST /api/auth/register", () => {
    it("creates the user with an empty collection and wishlist, and never leaks the password hash", async () => {
      const res = await register();
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        email: credentials.email,
        username: credentials.username,
        role: "USER",
      });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Password1/);
      expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));

      const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
      expect(user.passwordHash).not.toBe(credentials.password);
      expect(await prisma.collection.count({ where: { userId: user.id } })).toBe(1);
      expect(await prisma.wishlist.count({ where: { userId: user.id } })).toBe(1);
    });

    it("gives web clients the refresh token only as an HttpOnly cookie", async () => {
      const res = await register();
      expect(res.body.data.tokens.refreshToken).toBeUndefined();
      const cookie = refreshCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it("gives mobile clients the refresh token in the body and sets no cookie", async () => {
      const res = await register(credentials, { "x-client-type": "mobile" });
      expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
      expect(refreshCookie(res)).toBeUndefined();
    });

    it("rejects duplicate emails and usernames with 409", async () => {
      await register();
      const sameEmail = await register({ ...credentials, username: "other_name" });
      expect(sameEmail.status).toBe(409);
      expect(sameEmail.body.error.code).toBe("CONFLICT");
      const sameUsername = await register({ ...credentials, email: "other@example.com" });
      expect(sameUsername.status).toBe(409);
    });

    it.each([
      ["weak password", { password: "short" }],
      ["invalid email", { email: "nope" }],
      ["short username", { username: "ab" }],
      ["username with spaces", { username: "has space" }],
    ])("rejects %s with a 400 validation error", async (_label, override) => {
      const res = await register({ ...credentials, ...override });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
      expect(await prisma.user.count()).toBe(0);
    });

    it("normalizes the email to lower case", async () => {
      await register({ ...credentials, email: "ADA@Example.COM" });
      expect(await prisma.user.count({ where: { email: "ada@example.com" } })).toBe(1);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await register();
    });

    it("logs in with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: credentials.password });
      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe(credentials.username);
    });

    it("returns the same generic error for a wrong password and an unknown email", async () => {
      const wrong = await request(app)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: "Wrong123" });
      const unknown = await request(app)
        .post("/api/auth/login")
        .send({ email: "who@example.com", password: "Password1" });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.error.message).toBe(unknown.body.error.message);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the user for a valid bearer token", async () => {
      const { body } = await register();
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${body.data.tokens.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(credentials.email);
    });

    it.each([
      ["no header", undefined],
      ["a malformed header", "Token abc"],
      ["an invalid token", "Bearer not.a.jwt"],
    ])("rejects %s with 401", async (_label, header) => {
      const req = request(app).get("/api/auth/me");
      if (header) req.set("Authorization", header);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("refresh token rotation", () => {
    it("rotates the cookie-based refresh token and rejects reuse of the old one", async () => {
      const first = await register();
      const oldCookie = cookiePair(first);

      const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", oldCookie);
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.data.tokens.accessToken).toEqual(expect.any(String));
      const newCookie = cookiePair(refreshed);
      expect(newCookie).not.toBe(oldCookie);

      expect((await request(app).post("/api/auth/refresh").set("Cookie", oldCookie)).status).toBe(401);
      expect((await request(app).post("/api/auth/refresh").set("Cookie", newCookie)).status).toBe(200);
    });

    it("supports the mobile body-based flow", async () => {
      const first = await register(credentials, { "x-client-type": "mobile" });
      const refreshed = await request(app)
        .post("/api/auth/refresh")
        .set("x-client-type", "mobile")
        .send({ refreshToken: first.body.data.tokens.refreshToken });
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.data.tokens.refreshToken).not.toBe(first.body.data.tokens.refreshToken);
    });

    it("returns 401 when no refresh token is provided", async () => {
      expect((await request(app).post("/api/auth/refresh")).status).toBe(401);
    });

    it("keeps concurrent sessions (web + mobile) independent", async () => {
      const web = await register();
      await request(app)
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: credentials.email, password: credentials.password });
      expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(2);
      expect((await request(app).post("/api/auth/refresh").set("Cookie", cookiePair(web))).status).toBe(200);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("revokes the refresh token so it can no longer be used", async () => {
      const first = await register();
      const cookie = cookiePair(first);
      expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(200);
      expect((await request(app).post("/api/auth/refresh").set("Cookie", cookie)).status).toBe(401);
    });
  });

  describe("password reset", () => {
    it("does not reveal whether an email is registered", async () => {
      await register();
      const known = await request(app).post("/api/auth/forgot-password").send({ email: credentials.email });
      const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "ghost@example.com" });
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(unknown.body).toEqual(known.body);
    });

    it("resets the password with a valid token, revokes sessions, and makes the token single-use", async () => {
      const first = await register();
      const token = await createResetToken(60_000);

      const reset = await request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword2" });
      expect(reset.status).toBe(200);

      const login = (password: string) =>
        request(app).post("/api/auth/login").send({ email: credentials.email, password });
      expect((await login("Password1")).status).toBe(401);
      expect((await login("NewPassword2")).status).toBe(200);
      expect((await request(app).post("/api/auth/refresh").set("Cookie", cookiePair(first))).status).toBe(401);
      expect(
        (await request(app).post("/api/auth/reset-password").send({ token, password: "Another3Pass" })).status,
      ).toBe(401);
    });

    it("rejects expired and unknown tokens", async () => {
      await register();
      const expired = await createResetToken(-1000);
      const send = (token: string) =>
        request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword2" });
      expect((await send(expired)).status).toBe(401);
      expect((await send("nope")).status).toBe(401);
    });
  });
});

describe("app wiring", () => {
  it("serves a health check", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("returns the standard error envelope for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("sends security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows only the configured CORS origin", async () => {
    const ok = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(ok.headers["access-control-allow-credentials"]).toBe("true");
    const secondOrigin = await request(app).get("/health").set("Origin", "http://localhost:8081");
    expect(secondOrigin.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
    const blocked = await request(app).get("/health").set("Origin", "http://evil.test");
    expect(blocked.headers["access-control-allow-origin"]).not.toBe("http://evil.test");
  });
});
