import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandardVideoScript } from "../api/standardVideoApi";
import type { StandardVideoScriptCreatePayload } from "../api/standardVideoApi";
import { useApiError } from "./useApiError";

export function useCreateStandardVideoScript(videoId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: StandardVideoScriptCreatePayload) =>
      createStandardVideoScript(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "script"] });
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId] });
    },
    onError,
  });
}
