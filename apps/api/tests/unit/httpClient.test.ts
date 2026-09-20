import axios, { AxiosError, type AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../../src/providers/http";

const httpError = (status?: number) =>
  new AxiosError("boom", status ? "ERR_BAD_RESPONSE" : "ECONNRESET", undefined, undefined, status ? ({ status } as never) : undefined);

const fakeInstance = (get: ReturnType<typeof vi.fn>) => ({ get }) as unknown as AxiosInstance;

describe("createHttpClient", () => {
  it("returns the JSON body", async () => {
    const get = vi.fn().mockResolvedValue({ data: { ok: true } });
    const client = createHttpClient({ instance: fakeInstance(get) });
    expect(await client.getJson("/x")).toEqual({ ok: true });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 503])("retries a transient %i and then succeeds", async (status) => {
    const get = vi.fn().mockRejectedValueOnce(httpError(status)).mockResolvedValue({ data: 1 });
    const client = createHttpClient({ instance: fakeInstance(get), retryDelayMs: 0 });
    expect(await client.getJson("/x")).toBe(1);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("retries network errors that have no response", async () => {
    const get = vi.fn().mockRejectedValueOnce(httpError()).mockResolvedValue({ data: 2 });
    expect(await createHttpClient({ instance: fakeInstance(get), retryDelayMs: 0 }).getJson("/x")).toBe(2);
  });

  it.each([400, 401, 403, 404])("does not retry a %i", async (status) => {
    const get = vi.fn().mockRejectedValue(httpError(status));
    await expect(createHttpClient({ instance: fakeInstance(get), retryDelayMs: 0 }).getJson("/x")).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured number of retries", async () => {
    const get = vi.fn().mockRejectedValue(httpError(503));
    await expect(createHttpClient({ instance: fakeInstance(get), retries: 2, retryDelayMs: 0 }).getJson("/x")).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("does not retry errors that are not HTTP errors (bugs must surface)", async () => {
    const get = vi.fn().mockRejectedValue(new TypeError("bug"));
    await expect(createHttpClient({ instance: fakeInstance(get), retryDelayMs: 0 }).getJson("/x")).rejects.toThrow("bug");
    expect(get).toHaveBeenCalledTimes(1);
    expect(axios.isAxiosError(new TypeError("x"))).toBe(false);
  });

  it("downloads binary files as a Buffer", async () => {
    const get = vi.fn().mockResolvedValue({ data: new Uint8Array([1, 2, 3]).buffer });
    const client = createHttpClient({ instance: fakeInstance(get) });
    const buffer = await client.getBuffer("https://img/x.jpg");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect([...buffer]).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledWith("https://img/x.jpg", expect.objectContaining({ responseType: "arraybuffer" }));
  });
});
