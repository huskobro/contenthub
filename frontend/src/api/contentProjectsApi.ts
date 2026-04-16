/**
 * Content Projects API — Faz 4.
 */

import { api } from "./client";

const BASE = "/api/v1/content-projects";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentProjectResponse {
  id: string;
  user_id: string;
  channel_profile_id: string;
  module_type: string;
  title: string;
  description: string | null;
  current_stage: string | null;
  content_status: string;
  review_status: string;
  publish_status: string;
  primary_platform: string | null;
  origin_type: string;
  priority: string;
  deadline_at: string | null;
  active_job_id: string | null;
  latest_output_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentProjectFilters {
  user_id?: string;
  channel_profile_id?: string;
  module_type?: string;
  content_status?: string;
  skip?: number;
  limit?: number;
}

export interface CreateContentProject {
  user_id: string;
  channel_profile_id: string;
  module_type: string;
  title: string;
  description?: string;
  content_status?: string;
  publish_status?: string;
  primary_platform?: string;
  priority?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchContentProjects(
  params?: ContentProjectFilters,
): Promise<ContentProjectResponse[]> {
  return api.get<ContentProjectResponse[]>(BASE, params);
}

export function fetchContentProject(
  projectId: string,
): Promise<ContentProjectResponse> {
  return api.get<ContentProjectResponse>(`${BASE}/${projectId}`);
}

export function createContentProject(
  data: CreateContentProject,
): Promise<ContentProjectResponse> {
  return api.post<ContentProjectResponse>(BASE, data);
}

export function deleteContentProject(
  projectId: string,
): Promise<ContentProjectResponse> {
  return api.delete<ContentProjectResponse>(`${BASE}/${projectId}`);
}

// ---------------------------------------------------------------------------
// PHASE AF — project-scope summary
// ---------------------------------------------------------------------------

export interface ProjectSummary {
  project_id: string;
  jobs: {
    total: number;
    by_status: Record<string, number>;
    by_module: Record<string, number>;
    last_created_at: string | null;
  };
  publish: {
    total: number;
    by_status: Record<string, number>;
    last_published_at: string | null;
  };
}

export function fetchProjectSummary(projectId: string): Promise<ProjectSummary> {
  return api.get<ProjectSummary>(`${BASE}/${projectId}/summary`);
}

// PHASE AF — project jobs with optional module/status filter
export interface ProjectJobFilters {
  module_type?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface ProjectJobRow {
  id: string;
  module_type: string;
  status: string;
  owner_id: string | null;
  channel_profile_id: string | null;
  content_project_id: string;
  current_step_key: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export function fetchProjectJobs(
  projectId: string,
  filters?: ProjectJobFilters,
): Promise<ProjectJobRow[]> {
  return api.get<ProjectJobRow[]>(`${BASE}/${projectId}/jobs`, filters);
}
