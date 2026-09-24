import { authApi } from "./auth";
import { catalogApi } from "./catalog";
import { scansApi } from "./scans";
import { collectionApi } from "./collection";
import { quotaApi } from "./quota";

/** Single entry point for all API calls — components should never call apiClient/axios directly. */
export const api = {
  auth: authApi,
  catalog: catalogApi,
  scans: scansApi,
  collection: collectionApi,
  quota: quotaApi,
};
