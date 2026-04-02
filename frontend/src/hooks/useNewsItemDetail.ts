import { useQuery } from "@tanstack/react-query";
import { fetchNewsItemById } from "../api/newsItemsApi";

export function useNewsItemDetail(id: string | null) {
  return useQuery({
    queryKey: ["news-items", id],
    queryFn: () => fetchNewsItemById(id!),
    enabled: !!id,
  });
}
