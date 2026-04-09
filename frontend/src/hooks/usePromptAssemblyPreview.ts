import { useMutation } from "@tanstack/react-query";
import { previewAssembly, type AssemblyPreviewRequest } from "../api/promptAssemblyApi";
import { useApiError } from "./useApiError";

export function usePromptAssemblyPreview() {
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: AssemblyPreviewRequest) => previewAssembly(payload),
    onError,
  });
}
