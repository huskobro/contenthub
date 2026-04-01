import { useQuery } from "@tanstack/react-query";
import { fetchTemplates } from "../api/templatesApi";

export function useTemplatesList(params?: {
  template_type?: string;
  owner_scope?: string;
  module_scope?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["templates", params ?? {}],
    queryFn: () => fetchTemplates(params),
  });
}
