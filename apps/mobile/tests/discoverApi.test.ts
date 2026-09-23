import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { discoverApiUrl } from "@/utils/discoverApi";

jest.mock("expo-network", () => ({ getIpAddressAsync: jest.fn() }));

const BUILD_URL = "http://192.168.1.99:4100/api";
const healthy = { ok: true, json: async () => ({ success: true, data: { status: "ok" } }) };
const wrongServer = { ok: true, json: async () => ({ message: "some other app" }) };

/** Answers /health only for the given host; every other address rejects, like an unused IP would. */
const serveOnly = (host: string | null) =>
  jest.fn(async (url: string) => {
    if (host && url === `http://${host}:4100/health`) return healthy;
    throw new Error("unreachable");
  });

describe("discoverApiUrl", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(Network.getIpAddressAsync).mockResolvedValue("192.168.1.50");
  });

  it("uses the build-time URL when it answers", async () => {
    globalThis.fetch = serveOnly("192.168.1.99") as unknown as typeof fetch;
    await expect(discoverApiUrl(BUILD_URL)).resolves.toBe(BUILD_URL);
  });

  it("scans the subnet and remembers the host it found", async () => {
    globalThis.fetch = serveOnly("192.168.1.7") as unknown as typeof fetch;

    await expect(discoverApiUrl(BUILD_URL)).resolves.toBe("http://192.168.1.7:4100/api");
    await expect(AsyncStorage.getItem("cardscan_discovered_api_url")).resolves.toBe(
      "http://192.168.1.7:4100/api",
    );
  });

  it("prefers the remembered host over a scan", async () => {
    await AsyncStorage.setItem("cardscan_discovered_api_url", "http://192.168.1.3:4100/api");
    const fetchMock = serveOnly("192.168.1.3");
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(discoverApiUrl(BUILD_URL)).resolves.toBe("http://192.168.1.3:4100/api");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a server on the same port that is not CardScan", async () => {
    globalThis.fetch = jest.fn(async () => wrongServer) as unknown as typeof fetch;
    await expect(discoverApiUrl(BUILD_URL)).resolves.toBeNull();
  });

  it("returns null when the device has no IP to scan from", async () => {
    globalThis.fetch = serveOnly(null) as unknown as typeof fetch;
    jest.mocked(Network.getIpAddressAsync).mockRejectedValue(new Error("no network"));

    await expect(discoverApiUrl(BUILD_URL)).resolves.toBeNull();
  });
});
