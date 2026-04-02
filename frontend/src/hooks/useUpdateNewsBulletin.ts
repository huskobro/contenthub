import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletin } from "../api/newsBulletinApi";
import type { NewsBulletinUpdatePayload } from "../api/newsBulletinApi";

export function useUpdateNewsBulletin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsBulletinUpdatePayload) => updateNewsBulletin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletins", id] });
      queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
    },
  });
}
