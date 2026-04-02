import { useQuery } from "@tanstack/react-query";
import { fetchUsedNews } from "../api/usedNewsApi";

export function useUsedNewsList() {
  return useQuery({
    queryKey: ["used-news"],
    queryFn: fetchUsedNews,
  });
}
