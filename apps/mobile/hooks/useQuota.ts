import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";

export const QUOTA_KEY = ["quota"] as const;

/** Scans left today, credits and premium. Refreshed after every scan. */
export function useQuota() {
  const { user } = useAuth();
  return useQuery({ queryKey: QUOTA_KEY, queryFn: () => api.quota.get(), enabled: Boolean(user), staleTime: 30_000 });
}
