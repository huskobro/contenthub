import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTemplateStyleLink } from "../api/templateStyleLinksApi";
import type { TemplateStyleLinkUpdatePayload } from "../api/templateStyleLinksApi";
import { useApiError } from "./useApiError";

export function useUpdateTemplateStyleLink(linkId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: TemplateStyleLinkUpdatePayload) => updateTemplateStyleLink(linkId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-style-links"] });
      queryClient.invalidateQueries({ queryKey: ["template-style-links", linkId] });
    },
    onError,
  });
}
