import { useQuery } from "@tanstack/react-query";
import { fetchNewsItems } from "../api/newsItemsApi";

// Faz 4 perf: news items only change after a manual scan or admin edit,
// both of which already invalidate the key. 30s staleTime + no
// refetch-on-focus prevents the table from re-fetching on every tab focus.
const NEWS_ITEMS_STALE_MS = 30_000;

export function useNewsItemsList() {
  return useQuery({
    queryKey: ["news-items"],
    queryFn: () => fetchNewsItems(),
    staleTime: NEWS_ITEMS_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
