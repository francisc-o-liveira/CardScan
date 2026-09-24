import type { ApiResponse, ScanQuota } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

/** A subscription plan or a one-off scan pack. */
export type Product = "monthly" | "yearly" | "scans_25" | "scans_100";

export const quotaApi = {
  async get(): Promise<ScanQuota> {
    const { data } = await apiClient.get<ApiResponse<ScanQuota>>("/quota");
    return unwrap(data);
  },

  /** A web ad starts: the server opens a timed session. */
  async startWebAd(): Promise<{ sessionId: string; minWatchSeconds: number }> {
    const { data } = await apiClient.post<ApiResponse<{ sessionId: string; minWatchSeconds: number }>>("/ads/web/start");
    return unwrap(data);
  },

  /** The ad ended: the server adds the scans if the session ran long enough. */
  async completeWebAd(sessionId: string): Promise<number> {
    const { data } = await apiClient.post<ApiResponse<{ credits: number }>>("/ads/web/complete", { sessionId });
    return unwrap(data).credits;
  },

  /** The Stripe Checkout page for the plan or pack. */
  async checkout(product: Product): Promise<string> {
    const { data } = await apiClient.post<ApiResponse<{ url: string }>>("/billing/checkout", { product });
    return unwrap(data).url;
  },
};
