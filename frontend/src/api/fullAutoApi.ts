/**
 * Full-Auto Mode v1 API client — project-level automation + cron.
 *
 * Thin wrapper over the shared ``api`` object. Owns no state; React Query
 * hooks live in ``hooks/useFullAuto.ts``.
 */

import { api } from "./client";

const BASE = "/api/v1/full-auto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FullAutoRunMode = "manual" | "assisted" | "full_auto";
export type FullAutoPublishPolicy = "draft" | "schedule" | "publish_now";
export type FullAutoFallback = "pause" | "retry_once" | "stop";
export type FullAutoTriggerSource = "manual" | "scheduled" | "api";

export interface ProjectAutomationConfig {
  automation_enabled: boolean;
  automation_run_mode: FullAutoRunMode;
  automation_schedule_enabled: boolean;
  automation_cron_expression: string | null;
  automation_timezone: string;
  automation_default_template_id: string | null;
  automation_default_blueprint_id: string | null;
  automation_require_review_gate: boolean;
  automation_publish_policy: FullAutoPublishPolicy;
  automation_fallback_on_error: FullAutoFallback;
  automation_max_runs_per_day: number | null;
  automation_last_run_at: string | null;
  automation_next_run_at: string | null;
  automation_runs_today: number;
  automation_runs_today_date: string | null;
}

export interface ProjectAutomationConfigUpdate {
  automation_enabled?: boolean;
  automation_run_mode?: FullAutoRunMode;
  automation_schedule_enabled?: boolean;
  automation_cron_expression?: string | null;
  automation_timezone?: string;
  automation_default_template_id?: string | null;
  automation_default_blueprint_id?: string | null;
  automation_require_review_gate?: boolean;
  automation_publish_policy?: FullAutoPublishPolicy;
  automation_fallback_on_error?: FullAutoFallback;
  automation_max_runs_per_day?: number | null;
}

export interface FullAutoTriggerRequest {
  topic?: string;
  title?: string;
  brief?: string;
  note?: string;
}

export interface FullAutoTriggerResponse {
  accepted: boolean;
  reason: string | null;
  project_id: string;
  job_id: string | null;
  run_mode: FullAutoRunMode | null;
  trigger_source: FullAutoTriggerSource | null;
  scheduled_run_id: string | null;
}

export interface GuardCheckResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

export interface FullAutoSchedulerStatus {
  enabled: boolean;
  poll_interval_seconds: number;
  last_tick_at: string | null;
  last_tick_ok: boolean | null;
  last_tick_error: string | null;
  pending_project_count: number;
  next_candidate_project_id: string | null;
  next_candidate_run_at: string | null;
}

export interface CronPreviewResponse {
  expression: string;
  next_runs: string[];
}

// Daily automation digest (Phase Final F4) — read-only aggregate for dashboards.
export interface AutomationDigestProject {
  project_id: string;
  project_title: string | null;
  channel_profile_id: string | null;
  automation_enabled: boolean;
  automation_run_mode: FullAutoRunMode;
  automation_schedule_enabled: boolean;
  automation_cron_expression: string | null;
  automation_publish_policy: FullAutoPublishPolicy;
  automation_max_runs_per_day: number | null;
  runs_today: number;
  runs_today_date: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface AutomationDigest {
  scope: "user" | "admin";
  today_date: string;
  total_projects: number;
  automation_enabled_count: number;
  schedule_enabled_count: number;
  runs_today_total: number;
  runs_today_limit_total: number;
  at_limit_count: number;
  next_upcoming_run_at: string | null;
  projects: AutomationDigestProject[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const fullAutoApi = {
  getProjectConfig(projectId: string): Promise<ProjectAutomationConfig> {
    return api.get<ProjectAutomationConfig>(`${BASE}/content-projects/${projectId}`);
  },

  updateProjectConfig(
    projectId: string,
    patch: ProjectAutomationConfigUpdate,
  ): Promise<ProjectAutomationConfig> {
    return api.patch<ProjectAutomationConfig>(
      `${BASE}/content-projects/${projectId}`,
      patch,
    );
  },

  evaluate(projectId: string): Promise<GuardCheckResult> {
    return api.post<GuardCheckResult>(
      `${BASE}/content-projects/${projectId}/evaluate`,
    );
  },

  trigger(
    projectId: string,
    payload?: FullAutoTriggerRequest,
  ): Promise<FullAutoTriggerResponse> {
    return api.post<FullAutoTriggerResponse>(
      `${BASE}/content-projects/${projectId}/trigger`,
      payload,
    );
  },

  schedulerStatus(): Promise<FullAutoSchedulerStatus> {
    return api.get<FullAutoSchedulerStatus>(`${BASE}/scheduler/status`);
  },

  cronPreview(expression: string, count = 5): Promise<CronPreviewResponse> {
    return api.get<CronPreviewResponse>(`${BASE}/cron/preview`, {
      expression,
      count,
    });
  },

  digestToday(): Promise<AutomationDigest> {
    return api.get<AutomationDigest>(`${BASE}/digest/today`);
  },
};
