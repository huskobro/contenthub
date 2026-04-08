/**
 * ContentHub haber bülteni renk paleti sabitleri.
 *
 * Kategori bazlı görsel stil sistemi: 9 stil, her biri için
 * arka plan, aksant ve grid rengi.
 *
 * Tüm news-bulletin bileşenlerinin tek renk kaynağı — kopyalanmaz.
 */

import { BulletinStyle } from "../components/StudioBackground";

export const BULLETIN_ACCENT: Record<BulletinStyle, string> = {
  breaking:      "#DC2626",
  tech:          "#00E5FF",
  corporate:     "#2563EB",
  sport:         "#10B981",
  finance:       "#F59E0B",
  weather:       "#38BDF8",
  science:       "#8B5CF6",
  entertainment: "#EC4899",
  dark:          "#94A3B8",
};

export const BULLETIN_DARK_ACCENT: Record<BulletinStyle, string> = {
  breaking:      "#8B0000",
  tech:          "#0088AA",
  corporate:     "#0D3A8E",
  sport:         "#065F46",
  finance:       "#92400E",
  weather:       "#075985",
  science:       "#5B21B6",
  entertainment: "#9D174D",
  dark:          "#334155",
};

/**
 * M43: Dynamic accent resolver — categoryStyleMapping prop'u varsa
 * oradan okur, yoksa hardcoded BULLETIN_ACCENT fallback.
 */
export function resolveAccent(
  style: BulletinStyle,
  mapping?: Record<string, { accent?: string }> | null,
): string {
  if (mapping && mapping[style]?.accent) {
    return mapping[style].accent;
  }
  return BULLETIN_ACCENT[style] ?? BULLETIN_ACCENT.breaking;
}
