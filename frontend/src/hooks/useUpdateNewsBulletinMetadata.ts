import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletinMetadata } from "../api/newsBulletinApi";
import type { NewsBulletinMetadataUpdatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useUpdateNewsBulletinMetadata(bulletinId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinMetadataUpdatePayload) =>
      updateNewsBulletinMetadata(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-metadata", bulletinId] });
    },
    onError,
  });
}
