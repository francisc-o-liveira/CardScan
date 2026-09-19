import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "cardscan_refresh_token";

export const getStoredRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setStoredRefreshToken = (token: string) =>
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const clearStoredRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
