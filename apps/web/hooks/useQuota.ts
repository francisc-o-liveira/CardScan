"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { Product } from "@/services/quota";

export const QUOTA_KEY = ["quota"] as const;

/** Scans left today, credits and premium. Refreshed after every scan and when the tab regains focus. */
export function useQuota() {
  const { user } = useAuth();
  return useQuery({ queryKey: QUOTA_KEY, queryFn: () => api.quota.get(), enabled: Boolean(user), staleTime: 30_000 });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (product: Product) => {
      window.location.assign(await api.quota.checkout(product));
    },
  });
}
