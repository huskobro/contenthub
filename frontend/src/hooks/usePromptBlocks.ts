import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPromptBlocks,
  updatePromptBlock,
  type PromptBlockUpdatePayload,
} from "../api/promptAssemblyApi";
import { useApiError } from "./useApiError";

export function usePromptBlocksList(moduleScope?: string) {
  return useQuery({
    queryKey: ["prompt-blocks", moduleScope],
    queryFn: () => fetchPromptBlocks(moduleScope),
  });
}

export function useUpdatePromptBlock() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PromptBlockUpdatePayload }) =>
      updatePromptBlock(id, payload),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-blocks"] });
    },
  });
}
