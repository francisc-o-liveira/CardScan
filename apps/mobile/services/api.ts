import { authApi } from "./auth";

/** Single entry point for all API calls — screens should never call apiClient/axios directly. */
export const api = {
  auth: authApi,
};
