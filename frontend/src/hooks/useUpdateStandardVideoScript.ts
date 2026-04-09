import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStandardVideoScript } from "../api/standardVideoApi";
import type { StandardVideoScriptUpdatePayload } from "../api/standardVideoApi";
import { useApiError } from "./useApiError";

export function useUpdateStandardVideoScript(videoId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: StandardVideoScriptUpdatePayload) =>
      updateStandardVideoScript(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "script"] });
    },
    onError,
  });
}
