import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandardVideoMetadata } from "../api/standardVideoApi";
import type { StandardVideoMetadataCreatePayload } from "../api/standardVideoApi";

export function useCreateStandardVideoMetadata(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoMetadataCreatePayload) =>
      createStandardVideoMetadata(videoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId, "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["standard-videos", videoId] });
    },
  });
}
