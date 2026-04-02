import { useQuery } from "@tanstack/react-query";
import { fetchUsedNewsById } from "../api/usedNewsApi";

export function useUsedNewsDetail(id: string | null) {
  return useQuery({
    queryKey: ["used-news", id],
    queryFn: () => fetchUsedNewsById(id!),
    enabled: !!id,
  });
}
