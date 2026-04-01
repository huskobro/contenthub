import { useQuery } from "@tanstack/react-query";
import { fetchStyleBlueprints } from "../api/styleBlueprintsApi";

export function useStyleBlueprintsList(params?: {
  module_scope?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["style-blueprints", params ?? {}],
    queryFn: () => fetchStyleBlueprints(params),
  });
}
