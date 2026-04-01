import { useQuery } from "@tanstack/react-query";
import { fetchStyleBlueprintById } from "../api/styleBlueprintsApi";

export function useStyleBlueprintDetail(blueprintId: string | null) {
  return useQuery({
    queryKey: ["style-blueprints", blueprintId],
    queryFn: () => fetchStyleBlueprintById(blueprintId!),
    enabled: !!blueprintId,
  });
}
