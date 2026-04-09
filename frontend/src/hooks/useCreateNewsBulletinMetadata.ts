import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletinMetadata } from "../api/newsBulletinApi";
import type { NewsBulletinMetadataCreatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useCreateNewsBulletinMetadata(bulletinId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinMetadataCreatePayload) =>
      createNewsBulletinMetadata(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-metadata", bulletinId] });
    },
    onError,
  });
}
