"use client";

import type { TcgSlug } from "@cardscan/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { QUOTA_KEY } from "./useQuota";

const SCANS_KEY = ["scans"] as const;

export function useScanHistory() {
  return useQuery({ queryKey: SCANS_KEY, queryFn: () => api.scans.list() });
}

export function useCreateScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photo, tcg }: { photo: Blob; tcg?: TcgSlug }) => api.scans.create(photo, tcg),
    // The scan spent one, or was refused because none were left: either way the count changed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCANS_KEY }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUOTA_KEY }),
  });
}

export function useConfirmScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scanId, cardId }: { scanId: string; cardId: string }) => api.scans.confirm(scanId, cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCANS_KEY }),
  });
}
