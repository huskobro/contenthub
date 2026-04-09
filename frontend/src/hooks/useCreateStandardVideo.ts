import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandardVideo } from "../api/standardVideoApi";
import type { StandardVideoCreatePayload } from "../api/standardVideoApi";
import { useApiError } from "./useApiError";

export function useCreateStandardVideo() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: StandardVideoCreatePayload) => createStandardVideo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos"] });
    },
    onError,
  });
}
