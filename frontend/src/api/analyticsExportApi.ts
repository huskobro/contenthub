/**
 * Analytics CSV export — Gate 5 C1/C2.
 *
 * Thin client over GET /api/v1/analytics/export?kind=&format=csv.
 * Returns the CSV body as a string; caller is responsible for turning it
 * into a Blob/anchor download (see components/analytics/ExportButton).
 */

import { api } from "./client";

const BASE_URL = "/api/v1/analytics/export";

export type AnalyticsExportKind =
  | "overview"
  | "operations"
  | "content"
  | "source-impact"
  | "channel"
  | "template-impact"
  | "prompt-assembly"
  | "dashboard"
  | "publish"
  | "channel-performance";

export interface AnalyticsExportParams {
  kind: AnalyticsExportKind;
  window?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  channel_profile_id?: string;
  platform?: string;
}

export async function fetchAnalyticsCsv(params: AnalyticsExportParams): Promise<string> {
  const { kind, ...query } = params;
  const queryObj: Record<string, string | undefined> = { kind, format: "csv", ...query };
  return api.getText(BASE_URL, queryObj);
}
