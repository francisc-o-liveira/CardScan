import type { TcgSlug } from "@cardscan/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

const SCANS_KEY = ["scans"] as const;

export function useScanHistory() {
  return useQuery({ queryKey: SCANS_KEY, queryFn: () => api.scans.list() });
}

export function useCreateScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoUri, tcg }: { photoUri: string; tcg?: TcgSlug }) => api.scans.create(photoUri, tcg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCANS_KEY }),
  });
}

export function useConfirmScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scanId, cardId }: { scanId: string; cardId: string }) => api.scans.confirm(scanId, cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCANS_KEY }),
  });
}
