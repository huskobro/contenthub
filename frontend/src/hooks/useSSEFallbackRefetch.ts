/**
 * useSSEFallbackRefetch — SSE çevrimdışıyken periyodik React Query
 * invalidation yaparak "polling ile çalışılıyor" banner'ının gerçek
 * olmasını sağlar.
 *
 * Davranış:
 *   - `useSSEStatusStore.status === "offline"` iken her 15 saniyede bir
 *     `invalidateKeys` listesini invalid eder; status tekrar "live"
 *     olduğunda timer durur.
 *   - Grace window (8sn) hâlâ geçerlidir; bu hook yalnızca grace'den
 *     sonra devreye girer. Transient kopmalarda kullanıcı sessiz kalır.
 *
 * Layout seviyesinde bir kez çağrılır (AuroraAdminLayout / AuroraUserLayout).
 * Consumer'ların kendi polling'i varsa kapatılabilir.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSSEStatusStore } from "../stores/sseStatusStore";

interface UseSSEFallbackRefetchOptions {
  /** Dakika değil; milisaniye. Default 15_000 (15 sn). */
  intervalMs?: number;
  /** Fallback aktifken invalid edilecek query key prefix listesi. */
  invalidateKeys: unknown[][];
  /** false verilirse hook no-op çalışır (test vb.). */
  enabled?: boolean;
}

export function useSSEFallbackRefetch({
  intervalMs = 15_000,
  invalidateKeys,
  enabled = true,
}: UseSSEFallbackRefetchOptions): void {
  const qc = useQueryClient();
  const status = useSSEStatusStore((s) => s.status);

  useEffect(() => {
    if (!enabled) return;
    if (status !== "offline") return;
    if (invalidateKeys.length === 0) return;

    const tick = () => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    };

    // İlk tick'i hemen çalıştır ki banner göründüğü anda kullanıcı
    // taze veri görsün; sonra interval ile devam.
    tick();
    const handle = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(handle);
  }, [status, intervalMs, enabled, qc, invalidateKeys]);
}
