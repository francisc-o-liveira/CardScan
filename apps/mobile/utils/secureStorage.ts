import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "cardscan_refresh_token";

/**
 * On iOS/Android the refresh token lives in the OS keychain/keystore. SecureStore does not exist in a
 * browser, so the Expo *web* build (used for development and browser tests) falls back to localStorage.
 */
const isWeb = Platform.OS === "web";

export const getStoredRefreshToken = async (): Promise<string | null> =>
  isWeb ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setStoredRefreshToken = async (token: string): Promise<void> => {
  if (isWeb) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

export const clearStoredRefreshToken = async (): Promise<void> => {
  if (isWeb) window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
