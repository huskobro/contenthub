/**
 * SettingsModuleLanding — Redesign REV-2 / P2.3.
 *
 * `/admin/settings` girişine bir modül manzarası ekler. Admin, uzun effective
 * listesine inmek yerine 13 mantıksal grubun (tts / channels / publish / ...)
 * kartlarını görür; bir karta tıkladığında `/admin/settings/:group` rotasına
 * gider ve `EffectiveSettingsPanel` o grupla filtrelenmiş başlar.
 *
 * Veri tek kaynaklı: `useSettingsGroups()` — yeni bir endpoint üretmez.
 * Kartların sırası `EffectiveSettingsPanel.tsx`'teki `groupOrder` ile aynıdır
 * ki "kart → panel" aynı mental modeli sürdürsün.
 *
 * @see docs/redesign/MEMORY.md §1.6 (P2.3)
 */

import { useNavigate } from "react-router-dom";
import { useSettingsGroups } from "../../hooks/useEffectiveSettings";
import { GROUP_LABELS_MAP } from "./SettingGroupSection";

// Tek gerçek kaynak: EffectiveSettingsPanel'deki sıralama. Burada tekrar etmek
// yerine import edebilirdik ama prop-drilling yerine render-time eşleşmenin
// daha temiz kaldığına karar verildi (küçük, sabit liste — kod üzerinde elle
// takip edilebiliyor).
const GROUP_ORDER: string[] = [
  "credentials",
  "providers",
  "tts",
  "channels",
  "execution",
  "source_scans",
  "publish",
  "automation",
  "ui",
  "jobs",
  "wizard",
  "standard_video",
  "news_bulletin",
  "product_review",
  "modules",
  "system",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsModuleLanding() {
  const navigate = useNavigate();
  const { data: groups, isLoading, isError } = useSettingsGroups();

  if (isLoading) {
    return (
      <p
        className="text-sm text-neutral-500 py-6 text-center"
        data-testid="settings-module-landing-loading"
      >
        Modüller yükleniyor...
      </p>
    );
  }
  if (isError || !groups) {
    return (
      <p
        className="text-sm text-error-base py-6 text-center"
        data-testid="settings-module-landing-error"
      >
        Modül listesi yüklenemedi.
      </p>
    );
  }

  // Sıralı liste: önce GROUP_ORDER'dakiler, sonra listelenmemişler.
  const ordered = [...groups].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group);
    const bi = GROUP_ORDER.indexOf(b.group);
    const aRank = ai === -1 ? GROUP_ORDER.length : ai;
    const bRank = bi === -1 ? GROUP_ORDER.length : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.group.localeCompare(b.group);
  });

  return (
    <div
      className="mb-6"
      data-testid="settings-module-landing"
    >
      <div
        className="mb-3 text-sm text-neutral-600"
        data-testid="settings-module-landing-subtitle"
      >
        Ayar modülü seçin — {ordered.length} modül, {ordered.reduce((n, g) => n + g.total, 0)} ayar.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ordered.map((g) => {
          const label = GROUP_LABELS_MAP[g.group] ?? g.label ?? g.group;
          return (
            <button
              key={g.group}
              type="button"
              onClick={() => navigate(`/admin/settings/${g.group}`)}
              className="text-left p-4 border border-border-subtle rounded-md bg-surface-card hover:border-brand-400 hover:bg-surface-inset transition-colors"
              data-testid={`settings-module-card-${g.group}`}
            >
              <div className="font-semibold text-sm text-neutral-800 mb-1">
                {label}
              </div>
              <div className="flex gap-2 flex-wrap text-xs text-neutral-500">
                <span>{g.total} ayar</span>
                {g.wired > 0 && (
                  <span className="text-success-text">{g.wired} wired</span>
                )}
                {g.missing > 0 && (
                  <span className="text-error-text">{g.missing} eksik</span>
                )}
                {g.secret > 0 && (
                  <span className="text-neutral-500">{g.secret} gizli</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
