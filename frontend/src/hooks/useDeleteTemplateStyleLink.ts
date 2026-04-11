import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTemplateStyleLink } from "../api/templateStyleLinksApi";
import { useApiError } from "./useApiError";

/**
 * DELETE /api/v1/template-style-links/{link_id}
 *
 * Permanently removes a template/style-blueprint link. Running jobs are
 * unaffected because their template/blueprint snapshots are already
 * locked on the job row at start time.
 */
export function useDeleteTemplateStyleLink() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (linkId: string) => deleteTemplateStyleLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-style-links"] });
    },
    onError,
  });
}
