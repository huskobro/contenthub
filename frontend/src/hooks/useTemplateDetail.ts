import { useQuery } from "@tanstack/react-query";
import { fetchTemplateById } from "../api/templatesApi";

export function useTemplateDetail(templateId: string | null) {
  return useQuery({
    queryKey: ["templates", templateId],
    queryFn: () => fetchTemplateById(templateId!),
    enabled: !!templateId,
  });
}
