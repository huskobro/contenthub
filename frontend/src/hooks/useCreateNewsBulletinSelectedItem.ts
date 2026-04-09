import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletinSelectedItem } from "../api/newsBulletinApi";
import type { NewsBulletinSelectedItemCreatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useCreateNewsBulletinSelectedItem(bulletinId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinSelectedItemCreatePayload) =>
      createNewsBulletinSelectedItem(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-selected-items", bulletinId] });
    },
    onError,
  });
}
