/**
 * useEnabledModules — React Query hook for fetching module enabled status.
 *
 * Returns a map of moduleId → enabled boolean, plus the raw query result.
 * Used by sidebar, command palette, wizard, and content entry to hide
 * disabled modules from navigation and creation flows.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchModules, type ModuleInfo } from "../api/modulesApi";

export function useEnabledModules() {
  const query = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
    staleTime: 60_000, // 1 min — module enabled status doesn't change frequently
  });

  const enabledMap: Record<string, boolean> = {};
  if (query.data) {
    for (const m of query.data) {
      enabledMap[m.module_id] = m.enabled;
    }
  }

  return { ...query, enabledMap };
}
