import { describe, expect, it } from "vitest";
import {
  cardQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  paginationSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
  setQuerySchema,
  usernameSchema,
} from "../src";

describe("passwordSchema", () => {
  it("accepts a password with upper, lower and a digit", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
  });

  it.each([
    ["too short", "Pass1"],
    ["no uppercase", "password1"],
    ["no lowercase", "PASSWORD1"],
    ["no digit", "Password"],
    ["over 72 chars (bcrypt limit)", `Aa1${"x".repeat(70)}`],
  ])("rejects a password that is %s", (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it.each(["abc", "ada_l", "User_123", "a".repeat(24)])("accepts %s", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it.each(["ab", "a".repeat(25), "has space", "dash-ed", "emoji😀", ""])("rejects %j", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(usernameSchema.parse("  ada  ")).toBe("ada");
  });
});

describe("registerSchema / loginSchema", () => {
  it("lower-cases and trims the email", () => {
    const parsed = registerSchema.parse({ email: "  ADA@Example.com ", username: "ada", password: "Password1" });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("reports which field failed", () => {
    const result = registerSchema.safeParse({ email: "x", username: "ab", password: "p" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.error.flatten().fieldErrors).sort()).toEqual(["email", "password", "username"]);
    }
  });

  it("login requires a password but does not enforce the strength rules", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("forgot/reset password validate their inputs", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "", password: "Password1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "weak" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "Password1" }).success).toBe(true);
  });
});

describe("paginationSchema", () => {
  it("defaults to page 1, 50 per page", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 50 });
  });

  it("coerces query-string values", () => {
    expect(paginationSchema.parse({ page: "3", limit: "24" })).toEqual({ page: 3, limit: 24 });
  });

  it.each([{ page: "0" }, { page: "-1" }, { page: "1.5" }, { limit: "0" }, { limit: "101" }, { page: "abc" }])(
    "rejects %j",
    (value) => {
      expect(paginationSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("catalog query schemas", () => {
  it("cardQuerySchema accepts filters and pagination together", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(cardQuerySchema.parse({ tcg: "magic", setId: uuid, query: " lotus ", page: "2" })).toEqual({
      tcg: "magic",
      setId: uuid,
      query: "lotus",
      page: 2,
      limit: 50,
    });
  });

  it("rejects a non-uuid setId and an empty query", () => {
    expect(cardQuerySchema.safeParse({ setId: "abc" }).success).toBe(false);
    expect(cardQuerySchema.safeParse({ query: "   " }).success).toBe(false);
  });

  it("setQuerySchema treats the tcg filter as optional", () => {
    expect(setQuerySchema.parse({})).toEqual({});
    expect(setQuerySchema.parse({ tcg: "pokemon" })).toEqual({ tcg: "pokemon" });
  });
});
