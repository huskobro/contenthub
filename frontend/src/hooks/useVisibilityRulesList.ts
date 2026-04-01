import { useQuery } from "@tanstack/react-query";
import { fetchVisibilityRules } from "../api/visibilityApi";

export function useVisibilityRulesList() {
  return useQuery({
    queryKey: ["visibility-rules"],
    queryFn: fetchVisibilityRules,
  });
}
