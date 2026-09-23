import { authApi } from "./auth";
import { catalogApi } from "./catalog";
import { scansApi } from "./scans";

/** Single entry point for all API calls — screens should never call apiClient/axios directly. */
export const api = {
  auth: authApi,
  catalog: catalogApi,
  scans: scansApi,
};
