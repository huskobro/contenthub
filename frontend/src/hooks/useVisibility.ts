import { useQuery } from "@tanstack/react-query";
import { resolveVisibility, type VisibilityResolution } from "../api/visibilityApi";

const DEFAULT_RESOLUTION: VisibilityResolution = {
  visible: true,
  read_only: false,
  wizard_visible: false,
};

export function useVisibility(
  targetKey: string,
  params?: { role?: string; mode?: string; module_scope?: string },
) {
  const query = useQuery({
    queryKey: ["visibility", targetKey, params?.role, params?.mode, params?.module_scope],
    queryFn: () => resolveVisibility(targetKey, params),
    staleTime: 30_000,
    retry: false,
  });

  return {
    visible: query.data?.visible ?? true,
    readOnly: query.data?.read_only ?? false,
    wizardVisible: query.data?.wizard_visible ?? false,
    isLoading: query.isLoading,
    resolution: query.data ?? DEFAULT_RESOLUTION,
  };
}
