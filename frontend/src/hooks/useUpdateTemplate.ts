import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTemplate } from "../api/templatesApi";
import type { TemplateUpdatePayload } from "../api/templatesApi";
import { useApiError } from "./useApiError";

export function useUpdateTemplate(templateId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: TemplateUpdatePayload) => updateTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError,
  });
}
