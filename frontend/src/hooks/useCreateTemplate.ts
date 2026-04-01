import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTemplate } from "../api/templatesApi";
import type { TemplateCreatePayload } from "../api/templatesApi";

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateCreatePayload) => createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
