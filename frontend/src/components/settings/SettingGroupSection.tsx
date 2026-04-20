/**
 * SettingGroupSection — Extracted from EffectiveSettingsPanel.
 *
 * Renders a group header with total + missing count badges, followed by
 * the list of SettingRow components for that group.
 *
 * Registry kontrati: kayitsiz ayar yok — wired sayisi her zaman total'a
 * esit oldugu icin ayri "wired" rozeti gosterilmez.
 */

import { SettingRow } from "./SettingRow";
import type { EffectiveSetting, GroupSummary } from "../../api/effectiveSettingsApi";

// ---------------------------------------------------------------------------
// Group label map (shared with EffectiveSettingsPanel)
// ---------------------------------------------------------------------------

export const GROUP_LABELS_MAP: Record<string, string> = {
  credentials: "Kimlik Bilgileri",
  providers: "Provider Ayarlari",
  tts: "Seslendirme (TTS)",
  channels: "Kanallar",
  execution: "Calisma Ortami",
  source_scans: "Kaynak Tarama",
  publish: "Yayin Ayarlari",
  automation: "Otomasyon",
  ui: "Arayuz Ayarlari",
  jobs: "Is Motoru Ayarlari",
  wizard: "Wizard Yonetimi",
  standard_video: "Standart Video",
  news_bulletin: "Haber Bulteni",
  product_review: "Urun Incelemesi",
  modules: "Moduller",
  system: "Sistem",
};

// ---------------------------------------------------------------------------
// Group count badge
// ---------------------------------------------------------------------------

function GroupCountBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-neutral-100"
      style={{ color }}
    >
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Group section
// ---------------------------------------------------------------------------

export function SettingGroupSection({
  group,
  settings,
}: {
  group: GroupSummary;
  settings: EffectiveSetting[];
}) {
  return (
    <div className="mb-6" data-testid={`settings-group-${group.group}`}>
      <div className="flex items-center gap-3 text-base font-semibold text-neutral-700 mb-3 pb-2 border-b border-border">
        <span>{GROUP_LABELS_MAP[group.group] ?? group.label}</span>
        <GroupCountBadge count={group.total} color="var(--ch-neutral-700)" />
        {group.missing > 0 && (
          <span className="text-xs text-error-text">
            {group.missing} eksik
          </span>
        )}
      </div>
      {settings.map((s) => (
        <SettingRow key={s.key} setting={s} />
      ))}
    </div>
  );
}
