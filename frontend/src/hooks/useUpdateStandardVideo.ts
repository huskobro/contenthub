import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStandardVideo } from "../api/standardVideoApi";
import type { StandardVideoUpdatePayload } from "../api/standardVideoApi";

export function useUpdateStandardVideo(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StandardVideoUpdatePayload) => updateStandardVideo(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-videos"] });
    },
  });
}
