import { api } from "./client";

const BASE_URL = "/api/v1/jobs";

export interface JobStepResponse {
  id: string;
  job_id: string;
  step_key: string;
  step_order: number;
  status: string;
  artifact_refs_json: string | null;
  provider_trace_json: string | null;
  log_text: string | null;
  elapsed_seconds: number | null;
  elapsed_seconds_live: number | null;
  eta_seconds: number | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface JobResponse {
  id: string;
  module_type: string;
  status: string;
  owner_id: string | null;
  template_id: string | null;
  source_context_json: string | null;
  current_step_key: string | null;
  retry_count: number;
  elapsed_total_seconds: number | null;
  estimated_remaining_seconds: number | null;
  elapsed_seconds: number | null;
  eta_seconds: number | null;
  workspace_path: string | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  steps: JobStepResponse[];
}

export function fetchJobs(params?: { include_test_data?: boolean }): Promise<JobResponse[]> {
  return api.get<JobResponse[]>(BASE_URL, params);
}

export function fetchJobById(id: string): Promise<JobResponse> {
  return api.get<JobResponse>(`${BASE_URL}/${id}`);
}

export interface AllowedActions {
  can_cancel: boolean;
  can_retry: boolean;
  can_clone: boolean;
  skippable_steps: string[];
}

export function fetchAllowedActions(jobId: string): Promise<AllowedActions> {
  return api.get<AllowedActions>(`${BASE_URL}/${jobId}/allowed-actions`);
}

export function cancelJob(jobId: string): Promise<JobResponse> {
  return api.post<JobResponse>(`${BASE_URL}/${jobId}/cancel`);
}

export function retryJob(jobId: string): Promise<JobResponse> {
  return api.post<JobResponse>(`${BASE_URL}/${jobId}/retry`);
}

export function cloneJob(jobId: string): Promise<JobResponse> {
  return api.post<JobResponse>(`${BASE_URL}/${jobId}/clone`);
}

export function skipStep(jobId: string, stepKey: string): Promise<JobResponse> {
  return api.post<JobResponse>(`${BASE_URL}/${jobId}/steps/${stepKey}/skip`);
}

export function markJobsAsTestData(jobIds: string[]): Promise<{ marked_count: number }> {
  return api.post<{ marked_count: number }>(`${BASE_URL}/mark-test-data`, { job_ids: jobIds });
}

export function bulkArchiveTestData(
  olderThanDays: number = 7,
  moduleType?: string,
): Promise<{ archived_count: number }> {
  return api.post<{ archived_count: number }>(`${BASE_URL}/bulk-archive-test-data`, {
    older_than_days: olderThanDays,
    module_type: moduleType ?? null,
  });
}

export interface JobContentRef {
  job_id: string;
  module_type: string | null;
  content_id: string | null;
  content_title: string | null;
  content_status: string | null;
  content_url: string | null;
}

export function fetchJobContentRef(jobId: string): Promise<JobContentRef> {
  return api.get<JobContentRef>(`${BASE_URL}/${jobId}/content-ref`);
}
