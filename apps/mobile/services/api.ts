import { authApi } from "./auth";
import { catalogApi } from "./catalog";
import { quotaApi } from "./quota";
import { scansApi } from "./scans";
import { collectionApi } from "./collection";

/** Single entry point for all API calls — screens should never call apiClient/axios directly. */
export const api = {
  auth: authApi,
  catalog: catalogApi,
  quota: quotaApi,
  scans: scansApi,
  collection: collectionApi,
};
