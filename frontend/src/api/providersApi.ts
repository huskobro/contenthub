/**
 * Providers API — Provider yönetimi için HTTP istemcisi.
 *
 * Endpoint'ler:
 *   GET  /providers          — Tüm provider'ları listele (credential durumu dahil)
 *   POST /providers/default  — Capability için varsayılan provider ayarla
 *   POST /providers/{id}/test — Provider bağlantısını test et
 */

import { api } from "./client";

const BASE = "/api/v1/providers";

export interface ProviderEntry {
  provider_id: string;
  is_primary: boolean;
  priority: number;
  enabled: boolean;
  invoke_count: number;
  error_count: number;
  last_error: string | null;
  last_used_at: string | null;
  last_latency_ms: number | null;
  credential_source: "db" | "env" | "missing" | "not_required";
  credential_status: "ok" | "missing";
  credential_key: string | null;
}

export interface ProvidersResponse {
  capabilities: Record<string, ProviderEntry[]>;
  defaults: Record<string, string | null>;
}

export interface TestResult {
  provider_id: string;
  status: "ok" | "error";
  message: string;
}

export function fetchProviders(): Promise<ProvidersResponse> {
  return api.get<ProvidersResponse>(BASE);
}

export function testProviderConnection(providerId: string): Promise<TestResult> {
  return api.post<TestResult>(`${BASE}/${providerId}/test`);
}

export function setProviderDefault(capability: string, providerId: string): Promise<unknown> {
  return api.post(`${BASE}/default`, { capability, provider_id: providerId });
}
