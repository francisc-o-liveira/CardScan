import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";

const DISCOVERED_URL_KEY = "cardscan_discovered_api_url";
const API_PORT = 4100;
const PROBE_TIMEOUT_MS = 700;
const BATCH_SIZE = 32;

/** The API answers /health with this payload; any other server on the port fails the check. */
const isCardScanApi = async (origin: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${origin}/health`, { signal: controller.signal });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const toOrigin = (apiUrl: string): string => apiUrl.replace(/\/api\/?$/, "");

/** Every address in the phone's /24, ordered so the most likely router-assigned hosts come first. */
const subnetCandidates = (deviceIp: string): string[] => {
  const parts = deviceIp.split(".");
  if (parts.length !== 4) return [];
  const prefix = parts.slice(0, 3).join(".");
  const self = Number(parts[3]);
  return Array.from({ length: 254 }, (_, i) => i + 1)
    .filter((host) => host !== self)
    .map((host) => `${prefix}.${host}`);
};

/**
 * Scans the phone's own subnet for the API, in batches so a /24 finishes in a few seconds instead of
 * opening 254 sockets at once. Resolves with the first host that answers /health.
 */
const scanSubnet = async (deviceIp: string): Promise<string | null> => {
  const hosts = subnetCandidates(deviceIp);

  for (let start = 0; start < hosts.length; start += BATCH_SIZE) {
    const batch = hosts.slice(start, start + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (host) => {
        const origin = `http://${host}:${API_PORT}`;
        return (await isCardScanApi(origin)) ? origin : null;
      }),
    );
    const found = results.find((origin): origin is string => origin !== null);
    if (found) return found;
  }
  return null;
};

/**
 * Finds the API without the user typing anything: the address that worked last time, then the one
 * baked in at build time, then a scan of the local network. Returns null if nothing answers.
 */
export const discoverApiUrl = async (buildTimeUrl: string): Promise<string | null> => {
  const cached = await AsyncStorage.getItem(DISCOVERED_URL_KEY).catch(() => null);

  for (const candidate of [cached, buildTimeUrl]) {
    if (candidate && (await isCardScanApi(toOrigin(candidate)))) return candidate;
  }

  const deviceIp = await Network.getIpAddressAsync().catch(() => null);
  if (!deviceIp) return null;

  const origin = await scanSubnet(deviceIp);
  if (!origin) return null;

  const apiUrl = `${origin}/api`;
  await AsyncStorage.setItem(DISCOVERED_URL_KEY, apiUrl).catch(() => undefined);
  return apiUrl;
};
