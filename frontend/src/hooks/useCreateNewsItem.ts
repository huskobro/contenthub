import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsItem } from "../api/newsItemsApi";
import type { NewsItemCreatePayload } from "../api/newsItemsApi";

export function useCreateNewsItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsItemCreatePayload) => createNewsItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
    },
  });
}
