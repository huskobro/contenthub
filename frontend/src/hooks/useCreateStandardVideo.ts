import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStandardVideo } from "../api/standardVideoApi";
import type { StandardVideoCreatePayload } from "../api/standardVideoApi";

export function useCreateStandardVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoCreatePayload) => createStandardVideo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos"] });
    },
  });
}
