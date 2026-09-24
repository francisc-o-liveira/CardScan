import type { ApiResponse, ScanQuota } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export const quotaApi = {
  get: async (): Promise<ScanQuota> => {
    const { data } = await apiClient.get<ApiResponse<ScanQuota>>("/quota");
    return unwrap(data);
  },
};
