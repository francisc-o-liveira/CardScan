import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { discoverApiUrl } from "@/utils/discoverApi";

/** Build-time default, used as the first guess before the network scan (see discoverApiUrl). */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  // The Android emulator reaches the dev machine at 10.0.2.2, not localhost. Physical devices need
  // EXPO_PUBLIC_API_URL set to the machine's LAN address.
  (Platform.OS === "android" ? "http://10.0.2.2:4100/api" : "http://localhost:4100/api");

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    // Tells the API to deliver the refresh token in the response body instead of an
    // HTTP-only cookie, since the mobile client has no browser cookie jar.
    "x-client-type": "mobile",
  },
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let currentApiUrl = API_URL;

/**
 * Locating the API is automatic: the app checks the address it used last, the one baked in at build
 * time, and finally scans the local network. Requests wait for this the first time only.
 */
const discovery = discoverApiUrl(API_URL).then((found) => {
  if (found) currentApiUrl = found;
  return found;
});

export const getApiUrl = () => currentApiUrl;

apiClient.interceptors.request.use(async (config) => {
  await discovery;
  config.baseURL = currentApiUrl;
  return config;
});
