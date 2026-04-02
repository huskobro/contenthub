import { useQuery } from "@tanstack/react-query";
import { fetchNewsItems } from "../api/newsItemsApi";

export function useNewsItemsPickerList() {
  return useQuery({
    queryKey: ["news-items"],
    queryFn: fetchNewsItems,
  });
}
