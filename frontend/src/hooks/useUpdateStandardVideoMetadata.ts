import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStandardVideoMetadata } from "../api/standardVideoApi";
import type { StandardVideoMetadataUpdatePayload } from "../api/standardVideoApi";

export function useUpdateStandardVideoMetadata(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoMetadataUpdatePayload) =>
      updateStandardVideoMetadata(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "metadata"] });
    },
  });
}
