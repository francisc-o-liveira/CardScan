import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, AuthSession } from "@cardscan/types";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api",
  withCredentials: true,
});

let accessToken: string | null = null;
let onUnrecoverableAuthFailure: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/** AuthProvider registers a callback so the interceptor can clear client state when a refresh can't recover the session. */
export const setLogoutHandler = (handler: (() => void) | null) => {
  onUnrecoverableAuthFailure = handler;
};

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>("/auth/refresh");
    if (data.success) {
      setAccessToken(data.data.tokens.accessToken);
      return data.data.tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
};

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login");

    if (!shouldAttemptRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const newToken = await refreshPromise;
    if (!newToken) {
      setAccessToken(null);
      onUnrecoverableAuthFailure?.();
      return Promise.reject(error);
    }

    originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
    return apiClient(originalRequest);
  },
);
