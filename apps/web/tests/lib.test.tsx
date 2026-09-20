import { act, renderHook } from "@testing-library/react";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiClient, getAccessToken, setAccessToken, setLogoutHandler } from "@/lib/api-client";
import { getGreeting } from "@/lib/greeting";
import { applyTheme, getStoredTheme } from "@/lib/theme";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("only emits the latest value after the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "a" } });
    expect(result.current).toBe("a");

    rerender({ value: "ab" });
    rerender({ value: "abc" });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("abc");
  });
});

describe("getGreeting", () => {
  it.each([
    [5, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [17, "Good afternoon"],
    [18, "Good evening"],
    [23, "Good evening"],
  ])("at %i:00 says %s", (hour, expected) => {
    expect(getGreeting(new Date(2026, 0, 1, hour))).toBe(expected);
  });
});

describe("theme", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to dark, and persists + applies the chosen theme", () => {
    expect(getStoredTheme()).toBe("cardscan-dark");
    applyTheme("cardscan-light");
    expect(document.documentElement).toHaveAttribute("data-theme", "cardscan-light");
    expect(getStoredTheme()).toBe("cardscan-light");
  });

  it("ignores an unknown stored value", () => {
    window.localStorage.setItem("cardscan-theme", "neon");
    expect(getStoredTheme()).toBe("cardscan-dark");
  });
});

describe("apiClient auth interceptors", () => {
  const originalAdapter = apiClient.defaults.adapter;
  let calls: { url: string; auth?: string }[];

  const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> => {
    const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
    if (status >= 400) {
      return Promise.reject(Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, config, response }));
    }
    return Promise.resolve(response);
  };

  const useAdapter = (handler: (config: InternalAxiosRequestConfig, call: number) => Promise<AxiosResponse>) => {
    let count = 0;
    const adapter: AxiosAdapter = (config) => {
      calls.push({ url: config.url ?? "", auth: config.headers.get("Authorization") as string | undefined });
      return handler(config, count++);
    };
    apiClient.defaults.adapter = adapter;
  };

  beforeEach(() => {
    calls = [];
    setAccessToken(null);
    setLogoutHandler(null);
  });
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("sends the bearer token once set", async () => {
    useAdapter((config) => respond(config, 200, { ok: true }));
    setAccessToken("abc");
    await apiClient.get("/cards");
    expect(calls[0]?.auth).toBe("Bearer abc");
  });

  it("silently refreshes on 401 and retries the request with the new token", async () => {
    useAdapter((config) => {
      if (config.url === "/auth/refresh") {
        return respond(config, 200, { success: true, data: { user: {}, tokens: { accessToken: "fresh" } } });
      }
      return config.headers.get("Authorization") === "Bearer fresh" ? respond(config, 200, { ok: true }) : respond(config, 401, {});
    });
    setAccessToken("expired");

    const { data } = await apiClient.get("/cards");
    expect(data).toEqual({ ok: true });
    expect(getAccessToken()).toBe("fresh");
    expect(calls.map((c) => c.url)).toEqual(["/cards", "/auth/refresh", "/cards"]);
  });

  it("refreshes only once when several requests fail with 401 at the same time", async () => {
    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        await new Promise((r) => setTimeout(r, 10));
        return respond(config, 200, { success: true, data: { user: {}, tokens: { accessToken: "fresh" } } });
      }
      return config.headers.get("Authorization") === "Bearer fresh" ? respond(config, 200, {}) : respond(config, 401, {});
    });
    setAccessToken("expired");

    await Promise.all([apiClient.get("/a"), apiClient.get("/b"), apiClient.get("/c")]);
    expect(calls.filter((c) => c.url === "/auth/refresh")).toHaveLength(1);
  });

  it("logs the user out when the refresh itself fails", async () => {
    const onLogout = vi.fn();
    setLogoutHandler(onLogout);
    useAdapter((config) => respond(config, 401, {}));
    setAccessToken("expired");

    await expect(apiClient.get("/cards")).rejects.toThrow();
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it("does not try to refresh after a failed login", async () => {
    useAdapter((config) => respond(config, 401, {}));
    await expect(apiClient.post("/auth/login", {})).rejects.toThrow();
    expect(calls.map((c) => c.url)).toEqual(["/auth/login"]);
  });
});
