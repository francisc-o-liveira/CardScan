import { describe, expect, it } from "vitest";
import { isDue, jobKey } from "../../src/services/autoSyncService";

const NOW = Date.parse("2026-09-24T12:00:00Z");

describe("auto sync scheduling", () => {
  it("runs a job that never ran", () => {
    expect(isDue(undefined, 24, NOW)).toBe(true);
  });

  it("waits until the interval has passed", () => {
    expect(isDue("2026-09-24T00:00:00Z", 24, NOW)).toBe(false);
    expect(isDue("2026-09-23T12:00:00Z", 24, NOW)).toBe(true);
  });

  it("treats an unreadable date as due", () => {
    expect(isDue("not a date", 24, NOW)).toBe(true);
  });

  it("keys jobs by kind and game", () => {
    expect(jobKey("prices", "magic")).toBe("prices:magic");
  });
});
