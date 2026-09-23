import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { AddToCollectionInput, CollectionParams, UpdateCollectionItemInput } from "@/services/collection";

/** Every collection query lives under this key, so one invalidation refreshes the grid, totals and card. */
const COLLECTION_KEY = ["collection"] as const;
const PAGE_SIZE = 40;

/** Infinite scroll, like the other mobile lists; the web app pages instead. */
export function useCollection(filters: Omit<CollectionParams, "page" | "limit">) {
  return useInfiniteQuery({
    queryKey: [...COLLECTION_KEY, "list", filters],
    queryFn: ({ pageParam }) => api.collection.list({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useCollectionSummary() {
  return useQuery({ queryKey: [...COLLECTION_KEY, "summary"], queryFn: () => api.collection.summary() });
}

/**
 * Copies owned of the cards currently on screen, as `{ [cardId]: quantity }`, for the "you own x2" badge on
 * catalog grids. One small request per screenful; an empty object until it loads or when signed out.
 */
export function useOwned(cardIds: string[]) {
  const ids = [...new Set(cardIds)].slice(0, 200).sort();
  const { data } = useQuery({
    queryKey: [...COLLECTION_KEY, "owned", ids],
    queryFn: () => api.collection.owned(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });
  return data ?? {};
}

export function useCardInCollection(cardId: string | undefined) {
  return useQuery({
    queryKey: [...COLLECTION_KEY, "card", cardId],
    queryFn: () => api.collection.cardEntry(cardId!),
    enabled: Boolean(cardId),
  });
}

/** Adding, editing or removing copies refreshes every collection view, and scans (a scan may be confirmed). */
function useCollectionMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COLLECTION_KEY }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
      ]);
    },
  });
}

export const useAddToCollection = () => useCollectionMutation((input: AddToCollectionInput) => api.collection.add(input));

export const useUpdateCollectionItem = () =>
  useCollectionMutation(({ itemId, ...input }: UpdateCollectionItemInput & { itemId: string }) =>
    api.collection.update(itemId, input),
  );

export const useRemoveCollectionItem = () => useCollectionMutation((itemId: string) => api.collection.remove(itemId));
