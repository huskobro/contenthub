/**
 * EffectiveSettingsPanel — M10-E.
 *
 * Tum bilinen ayarlari grup bazli gosterir. Her ayar icin:
 *   - Effective deger (coerced, maskelenmis)
 *   - Kaynak (admin / default / env / builtin / missing)
 *   - Wired/Deferred durumu
 *   - wired_to bilgisi
 *   - Admin degeri girme/degistirme
 *
 * Wave 1 Final: Tailwind classes, useAutoSave, useSearchFocus integrated.
 *
 * Sub-components extracted to:
 * - SettingRow.tsx — individual setting display + edit
 * - SettingGroupSection.tsx — group header + collapsible container
 */

import { useState, useRef } from "react";
import {
  useEffectiveSettings,
  useSettingsGroups,
} from "../../hooks/useEffectiveSettings";
import { useSearchFocus } from "../../hooks/useSearchFocus";
import type { EffectiveSetting } from "../../api/effectiveSettingsApi";
import { SettingGroupSection, GROUP_LABELS_MAP } from "./SettingGroupSection";

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function EffectiveSettingsPanel() {
  const [filterGroup, setFilterGroup] = useState<string | undefined>(undefined);
  const [wiredOnly, setWiredOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  useSearchFocus(searchRef);

  const { data: groups, isLoading: groupsLoading } = useSettingsGroups();
  const { data: settings, isLoading: settingsLoading, isError, error } =
    useEffectiveSettings({ group: filterGroup, wired_only: wiredOnly });

  const isLoading = groupsLoading || settingsLoading;

  if (isLoading) {
    return <p className="text-neutral-600 text-base">Yukleniyor...</p>;
  }
  if (isError) {
    return (
      <p className="text-error-dark text-base">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!settings || settings.length === 0) {
    return <p className="text-neutral-600 text-base">Tanimli ayar bulunamadi.</p>;
  }

  // Filter by search term
  const filtered = searchTerm.trim()
    ? settings.filter(
        (s) =>
          s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.wired_to && s.wired_to.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : settings;

  // Group filtered settings
  const groupOrder = ["credentials", "providers", "execution", "source_scans", "publish", "ui", "jobs", "wizard", "standard_video", "news_bulletin", "modules"];
  const grouped: Record<string, EffectiveSetting[]> = {};
  for (const s of filtered) {
    const g = s.group || "general";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(s);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          ref={searchRef}
          className="w-[240px] px-2 py-1 border border-neutral-400 rounded-sm text-base box-border outline-none focus:border-focus"
          type="text"
          placeholder="Ayar ara... ( / )"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="settings-search"
        />
        <select
          className="w-[180px] px-2 py-1 border border-neutral-400 rounded-sm text-base box-border outline-none focus:border-focus"
          value={filterGroup ?? ""}
          onChange={(e) => setFilterGroup(e.target.value || undefined)}
          data-testid="settings-group-filter"
        >
          <option value="">Tum Gruplar</option>
          {(groups ?? []).map((g) => (
            <option key={g.group} value={g.group}>
              {GROUP_LABELS_MAP[g.group] ?? g.label} ({g.total})
            </option>
          ))}
        </select>
        <label className="text-sm text-neutral-600 flex items-center gap-1">
          <input
            type="checkbox"
            checked={wiredOnly}
            onChange={(e) => setWiredOnly(e.target.checked)}
            data-testid="settings-wired-only"
          />
          Sadece Wired
        </label>
        <span className="text-xs text-neutral-500">
          {filtered.length} / {settings.length} ayar
        </span>
      </div>

      {/* Group sections */}
      {groupOrder.map((gKey) => {
        const items = grouped[gKey];
        if (!items || items.length === 0) return null;
        const groupInfo = (groups ?? []).find((g) => g.group === gKey) ?? {
          group: gKey,
          label: gKey,
          total: items.length,
          wired: 0,
          secret: 0,
          missing: 0,
        };
        return <SettingGroupSection key={gKey} group={groupInfo} settings={items} />;
      })}

      {/* Unlisted groups */}
      {Object.keys(grouped)
        .filter((k) => !groupOrder.includes(k))
        .map((gKey) => {
          const items = grouped[gKey]!;
          return (
            <SettingGroupSection
              key={gKey}
              group={{ group: gKey, label: gKey, total: items.length, wired: 0, secret: 0, missing: 0 }}
              settings={items}
            />
          );
        })}
    </div>
  );
}
