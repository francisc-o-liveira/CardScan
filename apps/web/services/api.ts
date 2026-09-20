import { authApi } from "./auth";
import { catalogApi } from "./catalog";

/** Single entry point for all API calls — components should never call apiClient/axios directly. */
export const api = {
  auth: authApi,
  catalog: catalogApi,
};
