import { useQuery } from "@tanstack/react-query";
import { fetchTemplateStyleLinkById } from "../api/templateStyleLinksApi";

export function useTemplateStyleLinkDetail(linkId: string | null) {
  return useQuery({
    queryKey: ["template-style-links", linkId],
    queryFn: () => fetchTemplateStyleLinkById(linkId!),
    enabled: !!linkId,
  });
}
