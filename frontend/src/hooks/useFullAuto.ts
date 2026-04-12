/**
 * useFullAuto — React Query hooks for project-level full-auto automation.
 *
 * Wraps every method in ``fullAutoApi`` with proper query keys, cache
 * invalidation and error handling so the UI components never talk to the
 * API client directly.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fullAutoApi,
  type ProjectAutomationConfigUpdate,
  type FullAutoTriggerRequest,
} from "../api/fullAutoApi";
import { useApiError } from "./useApiError";

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const fullAutoKeys = {
  all: ["full-auto"] as const,
  config: (projectId: string | null) =>
    ["full-auto", "config", projectId] as const,
  schedulerStatus: () => ["full-auto", "scheduler-status"] as const,
  cronPreview: (expression: string, count: number) =>
    ["full-auto", "cron-preview", expression, count] as const,
};

// ---------------------------------------------------------------------------
// Project config
// ---------------------------------------------------------------------------

export function useProjectAutomationConfig(projectId: string | null) {
  return useQuery({
    queryKey: fullAutoKeys.config(projectId),
    queryFn: () => fullAutoApi.getProjectConfig(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useUpdateProjectAutomationConfig(projectId: string | null) {
  const queryClient = useQueryClient();
  const onError = useApiError();

  return useMutation({
    mutationFn: (patch: ProjectAutomationConfigUpdate) =>
      fullAutoApi.updateProjectConfig(projectId!, patch),
    onError,
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: fullAutoKeys.config(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: ["content-projects", projectId],
        });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Guard evaluation (dry-run)
// ---------------------------------------------------------------------------

export function useFullAutoEvaluate(projectId: string | null) {
  const onError = useApiError();

  return useMutation({
    mutationFn: () => fullAutoApi.evaluate(projectId!),
    onError,
  });
}

// ---------------------------------------------------------------------------
// Manual trigger
// ---------------------------------------------------------------------------

export function useFullAutoTrigger(projectId: string | null) {
  const queryClient = useQueryClient();
  const onError = useApiError();

  return useMutation({
    mutationFn: (payload?: FullAutoTriggerRequest) =>
      fullAutoApi.trigger(projectId!, payload),
    onError,
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: fullAutoKeys.config(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: ["content-projects", projectId],
        });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Scheduler status (admin)
// ---------------------------------------------------------------------------

export function useSchedulerStatus() {
  return useQuery({
    queryKey: fullAutoKeys.schedulerStatus(),
    queryFn: () => fullAutoApi.schedulerStatus(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Cron preview (debounced by caller)
// ---------------------------------------------------------------------------

export function useCronPreview(expression: string, count = 5) {
  return useQuery({
    queryKey: fullAutoKeys.cronPreview(expression, count),
    queryFn: () => fullAutoApi.cronPreview(expression, count),
    enabled: expression.trim().length > 0,
    staleTime: 60_000,
  });
}
