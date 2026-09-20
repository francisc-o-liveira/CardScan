import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";

/**
 * Image storage abstraction. The only driver today is the local disk (served by Express at /assets);
 * an S3/R2/MinIO driver can implement the same interface later without touching the sync services.
 */
export interface ImageStorage {
  exists(key: string): Promise<boolean>;
  put(key: string, data: Buffer): Promise<void>;
  publicUrl(key: string): string;
}

const assertSafeKey = (key: string) => {
  if (key.includes("..") || path.isAbsolute(key)) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
};

export const createLocalImageStorage = (rootDir: string, publicBaseUrl: string): ImageStorage => ({
  async exists(key) {
    assertSafeKey(key);
    try {
      await fs.access(path.join(rootDir, key));
      return true;
    } catch {
      return false;
    }
  },
  async put(key, data) {
    assertSafeKey(key);
    const target = path.join(rootDir, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    // Write-then-rename so an interrupted run never leaves a truncated image that `exists` would trust.
    const temp = `${target}.tmp`;
    await fs.writeFile(temp, data);
    await fs.rename(temp, target);
  },
  publicUrl(key) {
    assertSafeKey(key);
    return `${publicBaseUrl.replace(/\/$/, "")}/assets/${key}`;
  },
});

export const imageStorage: ImageStorage = createLocalImageStorage(env.ASSETS_DIR, env.API_PUBLIC_URL);
