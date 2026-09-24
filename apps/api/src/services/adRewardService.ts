import crypto from "node:crypto";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { grantCredits, startOfUtcDay } from "./quotaService";

/**
 * Rewarded ads, verified by Google. When someone finishes a rewarded ad, AdMob calls
 * `GET /api/ads/ssv?...&signature=...&key_id=...` on this server. The signature covers the query string
 * before `&signature=`, is ECDSA over SHA-256 and is checked with Google's public keys. Only a verified
 * callback adds credits, so the app cannot give itself scans by claiming it watched an ad.
 */
const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEYS_TTL_MS = 24 * 60 * 60 * 1000;

export interface VerifierKey {
  keyId: number | string;
  pem: string;
}

let cachedKeys: { keys: VerifierKey[]; fetchedAt: number } | null = null;

export const fetchVerifierKeys = async (now = Date.now()): Promise<VerifierKey[]> => {
  if (cachedKeys && now - cachedKeys.fetchedAt < KEYS_TTL_MS) return cachedKeys.keys;
  const { data } = await axios.get<{ keys: VerifierKey[] }>(KEYS_URL, { timeout: 10_000 });
  cachedKeys = { keys: data.keys, fetchedAt: now };
  return data.keys;
};

/** Google's web-safe base64 to bytes. */
const fromWebSafeBase64 = (value: string) => Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/** True when `rawQuery` (the callback's query string, exactly as received) carries a valid Google signature. */
export const verifySsvSignature = (rawQuery: string, keys: VerifierKey[]): boolean => {
  const at = rawQuery.indexOf("&signature=");
  if (at < 0) return false;
  const message = rawQuery.slice(0, at);
  const params = new URLSearchParams(rawQuery.slice(at + 1));
  const signature = params.get("signature");
  const keyId = params.get("key_id");
  const key = keys.find((candidate) => String(candidate.keyId) === keyId);
  if (!signature || !key) return false;
  try {
    return crypto.verify("sha256", Buffer.from(message), key.pem, fromWebSafeBase64(signature));
  } catch {
    return false;
  }
};

export type SsvResult = "granted" | "duplicate" | "capped" | "ignored";

/**
 * Turns a verified callback into credits. The reward is what we configured, not what the URL says, and
 * at most `REWARDED_ADS_PER_DAY` ads a day count.
 */
export const grantForRewardedAd = async (
  params: URLSearchParams,
  now = new Date(),
): Promise<SsvResult> => {
  const userId = params.get("user_id");
  const transactionId = params.get("transaction_id");
  if (!userId || !transactionId) return "ignored";
  if (env.ADMOB_REWARDED_AD_UNIT_ID && params.get("ad_unit") !== env.ADMOB_REWARDED_AD_UNIT_ID) return "ignored";
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return "ignored";

  const today = await prisma.scanCredit.count({
    where: { userId, source: "rewarded_ad", createdAt: { gte: startOfUtcDay(now) } },
  });
  if (today >= env.REWARDED_ADS_PER_DAY) return "capped";

  return (await grantCredits(userId, env.REWARDED_AD_CREDITS, "rewarded_ad", `admob:${transactionId}`))
    ? "granted"
    : "duplicate";
};
