import { useQuery } from "@tanstack/react-query";
import { fetchNewsItems } from "../api/newsItemsApi";

export function useNewsItemsList() {
  return useQuery({
    queryKey: ["news-items"],
    queryFn: fetchNewsItems,
  });
}
