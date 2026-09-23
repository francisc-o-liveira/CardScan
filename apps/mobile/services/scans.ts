import { Platform } from "react-native";
import type { ApiResponse, Scan } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

/** The camera hands back a file URI; native uploads send it as a file part, the web build as a Blob. */
const photoForm = async (photoUri: string): Promise<FormData> => {
  const form = new FormData();
  if (Platform.OS === "web") {
    form.append("image", await (await fetch(photoUri)).blob(), "card.jpg");
  } else {
    form.append("image", { uri: photoUri, name: "card.jpg", type: "image/jpeg" } as unknown as Blob);
  }
  return form;
};

export const scansApi = {
  create: async (photoUri: string): Promise<Scan> => {
    const { data } = await apiClient.post<ApiResponse<Scan>>("/scans", await photoForm(photoUri), {
      headers: { "Content-Type": "multipart/form-data" },
      // Recognition itself is fast; the upload of a phone photo over Wi-Fi can take a moment.
      timeout: 60_000,
    });
    return unwrap(data);
  },
  list: async (): Promise<Scan[]> => {
    const { data } = await apiClient.get<ApiResponse<Scan[]>>("/scans");
    return unwrap(data);
  },
  confirm: async (scanId: string, cardId: string): Promise<Scan> => {
    const { data } = await apiClient.post<ApiResponse<Scan>>(`/scans/${scanId}/confirm`, { cardId });
    return unwrap(data);
  },
};
