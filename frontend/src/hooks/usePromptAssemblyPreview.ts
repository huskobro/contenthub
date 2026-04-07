import { useMutation } from "@tanstack/react-query";
import { previewAssembly, type AssemblyPreviewRequest } from "../api/promptAssemblyApi";

export function usePromptAssemblyPreview() {
  return useMutation({
    mutationFn: (payload: AssemblyPreviewRequest) => previewAssembly(payload),
  });
}
