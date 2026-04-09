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
import { api } from "../api/client";

interface SubtitlePresetsResponse {
  presets: SubtitlePresetOption[];
  default_preset_id: string;
  preview_scope: string;
}

async function fetchSubtitlePresets(): Promise<SubtitlePresetsResponse> {
  return api.get<SubtitlePresetsResponse>("/api/v1/modules/standard-video/subtitle-presets");
}

export function useSubtitlePresets() {
  return useQuery({
    queryKey: ["subtitle-presets"],
    queryFn: fetchSubtitlePresets,
    staleTime: Infinity,
  });
}
