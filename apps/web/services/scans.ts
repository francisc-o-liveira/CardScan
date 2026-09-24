import type { ApiResponse, Scan, TcgSlug } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export const scansApi = {
  async create(photo: Blob, tcg?: TcgSlug): Promise<Scan> {
    const form = new FormData();
    form.append("image", photo, "card.jpg");
    if (tcg) form.append("tcg", tcg);
    // Recognition is fast; uploading a phone photo on a slow connection is what can take a while.
    const { data } = await apiClient.post<ApiResponse<Scan>>("/scans", form, { timeout: 60_000 });
    return unwrap(data);
  },

  async list(): Promise<Scan[]> {
    const { data } = await apiClient.get<ApiResponse<Scan[]>>("/scans");
    return unwrap(data);
  },

  async confirm(scanId: string, cardId: string): Promise<Scan> {
    const { data } = await apiClient.post<ApiResponse<Scan>>(`/scans/${scanId}/confirm`, { cardId });
    return unwrap(data);
  },
};
