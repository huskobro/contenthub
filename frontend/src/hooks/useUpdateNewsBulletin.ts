import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletin } from "../api/newsBulletinApi";
import type { NewsBulletinUpdatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useUpdateNewsBulletin(id: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinUpdatePayload) => updateNewsBulletin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletins", id] });
      queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
    },
    onError,
  });
}
