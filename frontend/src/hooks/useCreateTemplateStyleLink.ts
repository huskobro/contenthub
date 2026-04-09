import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTemplateStyleLink } from "../api/templateStyleLinksApi";
import type { TemplateStyleLinkCreatePayload } from "../api/templateStyleLinksApi";
import { useApiError } from "./useApiError";

export function useCreateTemplateStyleLink() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: TemplateStyleLinkCreatePayload) => createTemplateStyleLink(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-style-links"] });
    },
    onError,
  });
}
