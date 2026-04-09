import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStandardVideo } from "../api/standardVideoApi";
import type { StandardVideoUpdatePayload } from "../api/standardVideoApi";
import { useApiError } from "./useApiError";

export function useUpdateStandardVideo(id: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: StandardVideoUpdatePayload) => updateStandardVideo(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos"] });
    },
    onError,
  });
}
