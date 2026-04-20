/**
 * useSystemHealth — backend /api/v1/health snapshot.
 *
 * Aurora dashboard system health panel & diagnostics screens consume this.
 * Shape kasıtlı olarak minimal: backend henüz disk/CPU/memory metric
 * yayınlamıyor — sadece DB/WAL/venv/python veriliyor. UI eksik metric'leri
 * "—" gösterir, asla yalan değer üretmez (CLAUDE.md: no fake precision).
 */

import { useQuery } from "@tanstack/react-query";
import { fetchSystemHealth, type SystemHealth } from "../api/systemApi";

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
