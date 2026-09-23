import crypto from "node:crypto";
import axios from "axios";
import { imageStorage, type ImageStorage } from "../storage/imageStorage";
import { Errors } from "../utils/AppError";

/**
 * Hosts whose card images this API will fetch on a client's behalf. A fixed allowlist, never "any URL",
 * so the endpoint cannot be used to make the server request arbitrary addresses.
 */
export const PROXIED_IMAGE_HOSTS: ReadonlySet<string> = new Set(["cards.scryfall.io"]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

/** Validates the requested image URL and returns it parsed, or throws a 400. */
export const parseProxyTarget = (raw: unknown): URL => {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    throw Errors.validation("A card image URL is required");
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    throw Errors.validation("The image URL is not valid");
  }

  if (target.protocol !== "https:" || !PROXIED_IMAGE_HOSTS.has(target.hostname)) {
    throw Errors.validation("Images from that host cannot be proxied");
  }
  return target;
};

/** Stable storage key: the same source URL always maps to the same cached file. */
export const proxyStorageKey = (target: URL): string => {
  const hash = crypto.createHash("sha1").update(target.href).digest("hex");
  const ext = target.pathname.split(".").pop()?.toLowerCase() ?? "";
  return `proxy/${hash}.${EXTENSIONS.has(ext) ? ext : "jpg"}`;
};

/**
 * Makes sure the image is stored locally, downloading it from the source on first request, and returns
 * its storage key. Later requests are served from disk, so each card is fetched from the source once.
 */
export const ensureProxiedImage = async (target: URL, storage: ImageStorage = imageStorage): Promise<string> => {
  const key = proxyStorageKey(target);
  if (await storage.exists(key)) return key;

  try {
    const response = await axios.get<ArrayBuffer>(target.href, {
      responseType: "arraybuffer",
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_IMAGE_BYTES,
      headers: { "User-Agent": "CardScan/0.1 (image cache)", Accept: "image/*" },
    });
    await storage.put(key, Buffer.from(response.data));
    return key;
  } catch {
    throw Errors.notFound("The image could not be fetched");
  }
};
