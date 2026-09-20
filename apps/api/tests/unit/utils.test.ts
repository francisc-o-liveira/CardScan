import { describe, expect, it } from "vitest";
import { parseDurationMs } from "../../src/utils/duration";
import { mapWithConcurrency } from "../../src/utils/concurrency";
import { generateOpaqueToken, hashOpaqueToken } from "../../src/utils/opaqueToken";
import { hashPassword, verifyPassword } from "../../src/utils/password";
import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt";

describe("parseDurationMs", () => {
  it.each([
    ["30s", 30_000],
    ["15m", 900_000],
    ["1h", 3_600_000],
    ["30d", 2_592_000_000],
  ])("parses %s", (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it.each(["", "15", "m", "1w", "-5m", "1.5h"])("rejects %j", (input) => {
    expect(() => parseDurationMs(input)).toThrow(/Invalid duration/);
  });
});

describe("mapWithConcurrency", () => {
  it("returns results in input order", async () => {
    const result = await mapWithConcurrency([3, 1, 2], 2, async (n) => {
      await new Promise((r) => setTimeout(r, n * 5));
      return n * 10;
    });
    expect(result).toEqual([30, 10, 20]);
  });

  it("never runs more than `limit` tasks at once", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it("handles an empty list", async () => {
    expect(await mapWithConcurrency([], 5, async (x) => x)).toEqual([]);
  });
});

describe("opaque tokens", () => {
  it("stores a hash, never the raw token", () => {
    const { token, tokenHash } = generateOpaqueToken();
    expect(token).not.toBe(tokenHash);
    expect(hashOpaqueToken(token)).toBe(tokenHash);
    expect(generateOpaqueToken().token).not.toBe(token);
  });
});

describe("passwords", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("Password1");
    expect(hash).not.toContain("Password1");
    expect(await verifyPassword("Password1", hash)).toBe(true);
    expect(await verifyPassword("Password2", hash)).toBe(false);
  });
});

describe("access tokens", () => {
  it("round-trips the payload", () => {
    const token = signAccessToken({ sub: "user-1", role: "ADMIN" });
    expect(verifyAccessToken(token)).toMatchObject({ sub: "user-1", role: "ADMIN" });
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: "user-1", role: "USER" });
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
  });
});
