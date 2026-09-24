import axios from "axios";
import type { ScanQuota } from "@cardscan/types";

/** The user's quota when a scan was refused because they are out of scans, otherwise null. */
export const quotaExceeded = (error: unknown): ScanQuota | null => {
  if (!axios.isAxiosError(error) || error.response?.status !== 402) return null;
  const body = error.response.data as { error?: { code?: string; details?: ScanQuota } } | undefined;
  return body?.error?.code === "QUOTA_EXCEEDED" ? (body.error.details ?? null) : null;
};

/** The API's own message for a failed request (it explains 4xx/5xx in plain words), or a fallback. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return message;
    if (!error.response) return "CardScan can't reach the server. Check the connection and try again.";
  }
  return fallback;
};
