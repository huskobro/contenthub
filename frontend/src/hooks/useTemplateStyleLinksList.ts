import { useQuery } from "@tanstack/react-query";
import { fetchTemplateStyleLinks } from "../api/templateStyleLinksApi";

export function useTemplateStyleLinksList() {
  return useQuery({
    queryKey: ["template-style-links"],
    queryFn: () => fetchTemplateStyleLinks(),
  });
}
