import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsItem } from "../api/newsItemsApi";
import type { NewsItemUpdatePayload } from "../api/newsItemsApi";

export function useUpdateNewsItem(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsItemUpdatePayload) => updateNewsItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["news-items", itemId] });
    },
  });
}
