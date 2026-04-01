import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStandardVideoScript } from "../api/standardVideoApi";
import type { StandardVideoScriptUpdatePayload } from "../api/standardVideoApi";

export function useUpdateStandardVideoScript(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoScriptUpdatePayload) =>
      updateStandardVideoScript(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "script"] });
    },
  });
}
