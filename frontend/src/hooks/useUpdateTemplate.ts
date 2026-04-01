import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTemplate } from "../api/templatesApi";
import type { TemplateUpdatePayload } from "../api/templatesApi";

export function useUpdateTemplate(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateUpdatePayload) => updateTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
