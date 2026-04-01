import { useQuery } from "@tanstack/react-query";
import { fetchVisibilityRuleById } from "../api/visibilityApi";

export function useVisibilityRuleDetail(id: string | null) {
  return useQuery({
    queryKey: ["visibility-rules", id],
    queryFn: () => fetchVisibilityRuleById(id!),
    enabled: !!id,
  });
}
