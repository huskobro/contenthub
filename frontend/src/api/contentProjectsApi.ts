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
