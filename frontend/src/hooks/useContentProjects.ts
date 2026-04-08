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
  type ContentProjectFilters,
  type CreateContentProject,
} from "../api/contentProjectsApi";

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

export function useCreateContentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContentProject) => createContentProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-projects"] });
    },
  });
}
