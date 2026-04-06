import { api } from "./client";

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

export function fetchOverviewMetrics(
  windowOrOpts: AnalyticsWindow | OverviewFetchOptions,
): Promise<OverviewMetrics> {
  const params = typeof windowOrOpts === "string"
    ? { window: windowOrOpts }
    : { window: windowOrOpts.window, date_from: windowOrOpts.date_from, date_to: windowOrOpts.date_to };
  return api.get<OverviewMetrics>(`${BASE_URL}/overview`, params);
}

export function fetchOperationsMetrics(window: AnalyticsWindow): Promise<OperationsMetrics> {
  return api.get<OperationsMetrics>(`${BASE_URL}/operations`, { window });
}

export function fetchSourceImpactMetrics(window: AnalyticsWindow): Promise<SourceImpactMetrics> {
  return api.get<SourceImpactMetrics>(`${BASE_URL}/source-impact`, { window });
}

export function fetchChannelOverviewMetrics(window: AnalyticsWindow): Promise<ChannelOverviewMetrics> {
  return api.get<ChannelOverviewMetrics>(`${BASE_URL}/channel`, { window });
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

export function fetchContentMetrics(
  windowOrOpts: AnalyticsWindow | OverviewFetchOptions,
): Promise<ContentMetrics> {
  const params = typeof windowOrOpts === "string"
    ? { window: windowOrOpts }
    : { window: windowOrOpts.window, date_from: windowOrOpts.date_from, date_to: windowOrOpts.date_to };
  return api.get<ContentMetrics>(`${BASE_URL}/content`, params);
}
