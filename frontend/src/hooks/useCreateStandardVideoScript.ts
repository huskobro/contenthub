import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandardVideoScript } from "../api/standardVideoApi";
import type { StandardVideoScriptCreatePayload } from "../api/standardVideoApi";

export function useCreateStandardVideoScript(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoScriptCreatePayload) =>
      createStandardVideoScript(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "script"] });
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId] });
    },
  });
}
