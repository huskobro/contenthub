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
  workspace_path: string | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  steps: JobStepResponse[];
}

export async function fetchJobs(): Promise<JobResponse[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
  return res.json();
}

export async function fetchJobById(id: string): Promise<JobResponse> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch job ${id}: ${res.status}`);
  return res.json();
}
