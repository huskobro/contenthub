/**
 * useRecentPages — son ziyaret edilen 8 route'u localStorage'da tutar.
 *
 * CockpitShell Ctxbar workspace dropdown'unda gösterilir; kullanıcı bir
 * önceki ekrana hızlı geri dönebilsin. Liste route bazında benzersiz
 * tutulur (en son ziyaret en üstte). `label` route üstündeki ekranın
 * insan tarafından okunan adıdır — `recordRecentPage` çağrısını yapan
 * sayfa kendi başlığıyla yazar.
 *
 * Storage key: `aurora.recentPages.v1` (versiyonlu, ileride şema değişirse
 * yeni versiyonla geçilir). Cekirdek storage davranisi
 * `useVersionedLocalStorage` hook'unda.
 */
import { useCallback } from "react";

import {
  readVersionedStorage,
  useVersionedLocalStorage,
  writeVersionedStorage,
  type VersionedStorageDescriptor,
} from "./useVersionedLocalStorage";

export interface RecentPage {
  /** Tam route (`/admin/jobs/abc123`) */
  to: string;
  /** İnsan tarafından okunan başlık (örn: "İş Detayı · abc123") */
  label: string;
  /** ISO timestamp */
  visitedAt: string;
}

const MAX_ENTRIES = 8;

const RECENT_PAGES_DESCRIPTOR: VersionedStorageDescriptor<RecentPage[]> = {
  key: "aurora.recentPages.v1",
  defaultValue: [],
  validate: (raw) => {
    if (!Array.isArray(raw)) return null;
    return raw.filter(
      (p): p is RecentPage =>
        !!p &&
        typeof (p as RecentPage).to === "string" &&
        typeof (p as RecentPage).label === "string" &&
        typeof (p as RecentPage).visitedAt === "string",
    );
  },
};

/**
 * Aktif route + ekran başlığı tarafından çağrılır. Aynı route tekrar
 * yazıldığında en üste taşınır (sıralama korunur, kopya oluşmaz). Hook
 * disindan da cagrilabilir; useVersionedLocalStorage kanali ayni tab'daki
 * tum consumer'lara haber verir.
 */
export function recordRecentPage(entry: { to: string; label: string }): void {
  const current = readVersionedStorage(RECENT_PAGES_DESCRIPTOR);
  const filtered = current.filter((p) => p.to !== entry.to);
  const next: RecentPage[] = [
    { to: entry.to, label: entry.label, visitedAt: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_ENTRIES);
  writeVersionedStorage(RECENT_PAGES_DESCRIPTOR, next);
}

/**
 * Mevcut listeyi okur ve storage değişince re-render eder.
 * `clear()` HUD'da "geçmişi temizle" butonu için.
 */
export function useRecentPages() {
  const { value, set } = useVersionedLocalStorage(RECENT_PAGES_DESCRIPTOR);

  const clear = useCallback(() => set([]), [set]);

  return { list: value, clear };
}
