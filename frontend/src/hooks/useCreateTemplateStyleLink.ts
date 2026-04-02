import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTemplateStyleLink } from "../api/templateStyleLinksApi";
import type { TemplateStyleLinkCreatePayload } from "../api/templateStyleLinksApi";

export function useCreateTemplateStyleLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateStyleLinkCreatePayload) => createTemplateStyleLink(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-style-links"] });
    },
  });
}
