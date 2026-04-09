import { api } from "./client";

const BASE_URL = "/api/v1/analytics";

export type AnalyticsWindow = "last_7d" | "last_30d" | "last_90d" | "all_time";

// ---------------------------------------------------------------------------
// Shared filter params (Faz 6)
// ---------------------------------------------------------------------------

export interface AnalyticsFilterParams {
  window?: AnalyticsWindow;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  channel_profile_id?: string;
  platform?: string;
}

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
  review_pending_count: number;
  review_rejected_count: number;
  publish_backlog_count: number;
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
  total_assembly_runs: number;
  dry_run_count: number;
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
  avg_production_duration_seconds: number | null;
  avg_render_duration_seconds: number | null;
  retry_rate: number | null;
}

// ---------------------------------------------------------------------------
// Template Impact (Faz G)
// ---------------------------------------------------------------------------

export interface TemplateImpact {
  template_id: string | null;
  template_name: string | null;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  success_rate: number | null;
  avg_production_duration_seconds: number | null;
}

export interface BlueprintImpact {
  blueprint_id: string | null;
  blueprint_name: string | null;
  total_jobs: number;
  completed_jobs: number;
  success_rate: number | null;
}

export interface TemplateImpactMetrics {
  window: string;
  template_stats: TemplateImpact[];
  blueprint_stats: BlueprintImpact[];
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

export function fetchTemplateImpactMetrics(window: AnalyticsWindow): Promise<TemplateImpactMetrics> {
  return api.get<TemplateImpactMetrics>(`${BASE_URL}/template-impact`, { window });
}

export function fetchContentMetrics(
  windowOrOpts: AnalyticsWindow | OverviewFetchOptions,
): Promise<ContentMetrics> {
  const params = typeof windowOrOpts === "string"
    ? { window: windowOrOpts }
    : { window: windowOrOpts.window, date_from: windowOrOpts.date_from, date_to: windowOrOpts.date_to };
  return api.get<ContentMetrics>(`${BASE_URL}/content`, params);
}

// ---------------------------------------------------------------------------
// Prompt Assembly Metrics (M37)
// ---------------------------------------------------------------------------

export interface AssemblyModuleStat {
  module_scope: string;
  run_count: number;
  avg_included_blocks: number;
  avg_skipped_blocks: number;
}

export interface AssemblyProviderStat {
  provider_name: string;
  run_count: number;
  response_received_count: number;
  error_count: number;
}

export interface PromptAssemblyMetrics {
  window: string;
  total_assembly_runs: number;
  dry_run_count: number;
  production_run_count: number;
  avg_included_blocks: number;
  avg_skipped_blocks: number;
  module_stats: AssemblyModuleStat[];
  provider_stats: AssemblyProviderStat[];
}

export function fetchPromptAssemblyMetrics(window: AnalyticsWindow): Promise<PromptAssemblyMetrics> {
  return api.get<PromptAssemblyMetrics>(`${BASE_URL}/prompt-assembly`, { window });
}

// ---------------------------------------------------------------------------
// Dashboard Summary (Faz 6)
// ---------------------------------------------------------------------------

export interface DailyTrendItem {
  date: string;
  job_count: number;
  completed_count: number;
  failed_count: number;
  publish_count: number;
  publish_success_count: number;
}

export interface DashboardSummary {
  window: string;
  total_projects: number;
  total_jobs: number;
  active_jobs: number;
  total_publish: number;
  publish_success_rate: number | null;
  avg_production_duration_seconds: number | null;
  retry_rate: number | null;
  failed_job_count: number;
  queue_size: number;
  recent_errors: Array<{ job_id: string; module_type: string; error: string; created_at: string }>;
  daily_trend: DailyTrendItem[];
  module_distribution: ModuleDistribution[];
  platform_distribution: Array<{ platform: string; count: number; published: number; failed: number }>;
  filters_applied: Record<string, string>;
}

export function fetchDashboardSummary(
  filters: AnalyticsFilterParams = {},
): Promise<DashboardSummary> {
  const params: Record<string, string> = { window: filters.window || "last_30d" };
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.channel_profile_id) params.channel_profile_id = filters.channel_profile_id;
  if (filters.platform) params.platform = filters.platform;
  return api.get<DashboardSummary>(`${BASE_URL}/dashboard`, params);
}

// ---------------------------------------------------------------------------
// Publish Analytics (Faz 6)
// ---------------------------------------------------------------------------

export interface PublishAnalyticsData {
  window: string;
  total_publish_count: number;
  published_count: number;
  failed_count: number;
  draft_count: number;
  in_review_count: number;
  scheduled_count: number;
  publish_success_rate: number | null;
  avg_time_to_publish_seconds: number | null;
  platform_breakdown: Array<{ platform: string; count: number; published: number; failed: number }>;
  daily_publish_trend: DailyTrendItem[];
  filters_applied: Record<string, string>;
}

export function fetchPublishAnalytics(
  filters: AnalyticsFilterParams = {},
): Promise<PublishAnalyticsData> {
  const params: Record<string, string> = { window: filters.window || "all_time" };
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.channel_profile_id) params.channel_profile_id = filters.channel_profile_id;
  if (filters.platform) params.platform = filters.platform;
  return api.get<PublishAnalyticsData>(`${BASE_URL}/publish`, params);
}

// ---------------------------------------------------------------------------
// Filter-aware fetch wrappers (Faz 6)
// ---------------------------------------------------------------------------

export function fetchOverviewMetricsFiltered(
  filters: AnalyticsFilterParams,
): Promise<OverviewMetrics> {
  const params: Record<string, string> = { window: filters.window || "all_time" };
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.channel_profile_id) params.channel_profile_id = filters.channel_profile_id;
  if (filters.platform) params.platform = filters.platform;
  return api.get<OverviewMetrics>(`${BASE_URL}/overview`, params);
}

export function fetchOperationsMetricsFiltered(
  filters: AnalyticsFilterParams,
): Promise<OperationsMetrics> {
  const params: Record<string, string> = { window: filters.window || "all_time" };
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.channel_profile_id) params.channel_profile_id = filters.channel_profile_id;
  if (filters.platform) params.platform = filters.platform;
  return api.get<OperationsMetrics>(`${BASE_URL}/operations`, params);
}

export function fetchContentMetricsFiltered(
  filters: AnalyticsFilterParams,
): Promise<ContentMetrics> {
  const params: Record<string, string> = { window: filters.window || "all_time" };
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.channel_profile_id) params.channel_profile_id = filters.channel_profile_id;
  if (filters.platform) params.platform = filters.platform;
  return api.get<ContentMetrics>(`${BASE_URL}/content`, params);
}
