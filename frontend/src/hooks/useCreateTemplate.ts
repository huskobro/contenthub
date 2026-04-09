import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTemplate } from "../api/templatesApi";
import type { TemplateCreatePayload } from "../api/templatesApi";
import { useApiError } from "./useApiError";

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: TemplateCreatePayload) => createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError,
  });
}
