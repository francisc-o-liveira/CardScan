import axios from "axios";
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4100/api";

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
