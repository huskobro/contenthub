import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletinSelectedItem } from "../api/newsBulletinApi";
import type { NewsBulletinSelectedItemUpdatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useUpdateNewsBulletinSelectedItem(bulletinId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ selectionId, payload }: { selectionId: string; payload: NewsBulletinSelectedItemUpdatePayload }) =>
      updateNewsBulletinSelectedItem(bulletinId, selectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-selected-items", bulletinId] });
    },
    onError,
  });
}
