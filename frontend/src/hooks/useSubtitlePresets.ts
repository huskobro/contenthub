/**
 * Altyazı stil preset listesi hook'u — M4-C3.
 *
 * /api/v1/modules/standard-video/subtitle-presets endpoint'inden preset listesini yükler.
 * Veri staleTime: Infinity — preset listesi uygulama içinde değişmez (build-time sabit).
 *
 * Kapsam notu:
 *   Bu hook yalnızca subtitle stil seçimi içindir.
 *   M6 genel preview altyapısından ayrıdır.
 */

import { useQuery } from "@tanstack/react-query";
import type { SubtitlePresetOption } from "../components/standard-video/SubtitleStylePicker";

interface SubtitlePresetsResponse {
  presets: SubtitlePresetOption[];
  default_preset_id: string;
  preview_scope: string;
}

async function fetchSubtitlePresets(): Promise<SubtitlePresetsResponse> {
  const res = await fetch("/api/v1/modules/standard-video/subtitle-presets");
  if (!res.ok) throw new Error(`Subtitle presets yüklenemedi: ${res.status}`);
  return res.json();
}

export function useSubtitlePresets() {
  return useQuery({
    queryKey: ["subtitle-presets"],
    queryFn: fetchSubtitlePresets,
    staleTime: Infinity,
  });
}
