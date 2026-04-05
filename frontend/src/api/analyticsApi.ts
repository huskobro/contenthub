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

// ---------------------------------------------------------------------------
// Source Impact (M17-A)
// ---------------------------------------------------------------------------

export interface SourceStat {
  source_id: string;
  source_name: string;
  source_type: string;
  status: string;
  scan_count: number;
  news_count: number;
  used_news_count: number;
}

export interface SourceImpactMetrics {
  window: string;
  total_sources: number;
  active_sources: number;
  total_scans: number;
  successful_scans: number;
  total_news_items: number;
  used_news_count: number;
  bulletin_count: number;
  source_stats: SourceStat[];
}

// ---------------------------------------------------------------------------
// Channel Overview (M17-C)
// ---------------------------------------------------------------------------

export interface YouTubeChannelMetrics {
  total_publish_attempts: number;
  published_count: number;
  failed_count: number;
  draft_count: number;
  in_progress_count: number;
  publish_success_rate: number | null;
  last_published_at: string | null;
  has_publish_history: boolean;
}

export interface ChannelOverviewMetrics {
  window: string;
  youtube: YouTubeChannelMetrics;
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export interface OverviewFetchOptions {
  window: AnalyticsWindow;
  date_from?: string;
  date_to?: string;
}

export async function fetchOverviewMetrics(
  windowOrOpts: AnalyticsWindow | OverviewFetchOptions,
): Promise<OverviewMetrics> {
  let url: string;
  if (typeof windowOrOpts === "string") {
    url = `${BASE_URL}/overview?window=${windowOrOpts}`;
  } else {
    const params = new URLSearchParams({ window: windowOrOpts.window });
    if (windowOrOpts.date_from) params.set("date_from", windowOrOpts.date_from);
    if (windowOrOpts.date_to) params.set("date_to", windowOrOpts.date_to);
    url = `${BASE_URL}/overview?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analytics overview fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchOperationsMetrics(window: AnalyticsWindow): Promise<OperationsMetrics> {
  const res = await fetch(`${BASE_URL}/operations?window=${window}`);
  if (!res.ok) throw new Error(`Analytics operations fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSourceImpactMetrics(window: AnalyticsWindow): Promise<SourceImpactMetrics> {
  const res = await fetch(`${BASE_URL}/source-impact?window=${window}`);
  if (!res.ok) throw new Error(`Analytics source-impact fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchChannelOverviewMetrics(window: AnalyticsWindow): Promise<ChannelOverviewMetrics> {
  const res = await fetch(`${BASE_URL}/channel?window=${window}`);
  if (!res.ok) throw new Error(`Analytics channel fetch failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Content Analytics (M18-A)
// ---------------------------------------------------------------------------

export interface ModuleDistribution {
  module_type: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  success_rate: number | null;
}

export interface ContentTypeBreakdown {
  type: string;
  count: number;
}

export interface ContentMetrics {
  window: string;
  module_distribution: ModuleDistribution[];
  content_output_count: number;
  published_content_count: number;
  avg_time_to_publish_seconds: number | null;
  content_type_breakdown: ContentTypeBreakdown[];
  active_template_count: number;
  active_blueprint_count: number;
}

export async function fetchContentMetrics(
  windowOrOpts: AnalyticsWindow | OverviewFetchOptions,
): Promise<ContentMetrics> {
  let url: string;
  if (typeof windowOrOpts === "string") {
    url = `${BASE_URL}/content?window=${windowOrOpts}`;
  } else {
    const params = new URLSearchParams({ window: windowOrOpts.window });
    if (windowOrOpts.date_from) params.set("date_from", windowOrOpts.date_from);
    if (windowOrOpts.date_to) params.set("date_to", windowOrOpts.date_to);
    url = `${BASE_URL}/content?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analytics content fetch failed: ${res.status}`);
  return res.json();
}
