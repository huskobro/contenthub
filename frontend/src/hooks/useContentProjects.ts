/**
 * Content Project hooks — Faz 4.
 *
 * React Query hooks for content project CRUD.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContentProjects,
  fetchContentProject,
  createContentProject,
  fetchProjectSummary,
  fetchProjectJobs,
  type ContentProjectFilters,
  type CreateContentProject,
  type ProjectJobFilters,
} from "../api/contentProjectsApi";
import { useApiError } from "./useApiError";

export function useContentProjects(params?: ContentProjectFilters) {
  return useQuery({
    queryKey: ["content-projects", params ?? {}],
    queryFn: () => fetchContentProjects(params),
  });
}

export function useContentProject(projectId: string) {
  return useQuery({
    queryKey: ["content-projects", projectId],
    queryFn: () => fetchContentProject(projectId),
    enabled: !!projectId,
  });
}

/**
 * PHASE AF — project-scope aggregate summary (jobs + publish counts).
 * Backend: GET /content-projects/{id}/summary
 */
export function useProjectSummary(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["content-projects", projectId, "summary"],
    queryFn: () => fetchProjectSummary(projectId as string),
    enabled: !!projectId,
  });
}

/**
 * PHASE AF — project-scope jobs with optional module/status filter.
 * Backend: GET /content-projects/{id}/jobs
 */
export function useProjectJobs(
  projectId: string | undefined | null,
  filters?: ProjectJobFilters,
) {
  return useQuery({
    queryKey: ["content-projects", projectId, "jobs", filters ?? {}],
    queryFn: () => fetchProjectJobs(projectId as string, filters),
    enabled: !!projectId,
  });
}

export function useCreateContentProject() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (data: CreateContentProject) => createContentProject(data),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-projects"] });
    },
  });
}
