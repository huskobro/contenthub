const BASE_URL = "/api/v1/analytics";

export type AnalyticsWindow = "last_7d" | "last_30d" | "last_90d" | "all_time";

export interface StepStat {
  step_key: string;
  count: number;
  avg_elapsed_seconds: number | null;
  failed_count: number;
}

export interface OverviewMetrics {
  window: string;
  total_job_count: number;
  completed_job_count: number;
  failed_job_count: number;
  job_success_rate: number | null;
  total_publish_count: number;
  published_count: number;
  failed_publish_count: number;
  publish_success_rate: number | null;
  avg_production_duration_seconds: number | null;
  retry_rate: number | null;
}

export interface ProviderStat {
  provider_name: string;
  provider_kind: string;
  total_calls: number;
  failed_calls: number;
  error_rate: number | null;
  avg_latency_ms: number | null;
  total_estimated_cost_usd: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
}

export interface OperationsMetrics {
  window: string;
  avg_render_duration_seconds: number | null;
  step_stats: StepStat[];
  provider_error_rate: number | null;
  provider_stats: ProviderStat[];
}

export async function fetchOverviewMetrics(window: AnalyticsWindow): Promise<OverviewMetrics> {
  const res = await fetch(`${BASE_URL}/overview?window=${window}`);
  if (!res.ok) throw new Error(`Analytics overview fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchOperationsMetrics(window: AnalyticsWindow): Promise<OperationsMetrics> {
  const res = await fetch(`${BASE_URL}/operations?window=${window}`);
  if (!res.ok) throw new Error(`Analytics operations fetch failed: ${res.status}`);
  return res.json();
}
