import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletin } from "../api/newsBulletinApi";
import type { NewsBulletinCreatePayload } from "../api/newsBulletinApi";

export function useCreateNewsBulletin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsBulletinCreatePayload) => createNewsBulletin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
    },
  });
}
