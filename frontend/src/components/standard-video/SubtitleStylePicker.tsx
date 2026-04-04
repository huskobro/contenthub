/**
 * Subtitle stil seçici — M4-C3 preview-first UI.
 *
 * Her preset için bir stil kartı gösterir. Stil kartı:
 *   - Preset'in renklerini, font ağırlığını, arka planını CSS ile inline önizler.
 *   - Örnek bir karaoke satırı gösterir (aktif kelime active_color ile).
 *   - Timing degrade uyarısını görünür kılar.
 *
 * KAPSAM NOTU (M4-C3):
 *   Bu component yalnızca subtitle stil seçimi için preview sunar.
 *   M6 genel preview altyapısına (kompozisyon preview, Remotion renderStill) dahil değildir.
 *   Stil kartı CSS-tabanlıdır — Remotion gerektirmez.
 *
 * Preview artifact vs final artifact ayrımı:
 *   - Bu component bir PREVIEW gösterir (CSS inline render).
 *   - Final artifact: Remotion render çıktısı (M6'da aktif).
 *   - Preview ve final birbirinin yerini tutmaz; UI'da açıkça etiketlenmiştir.
 *
 * Degrade mod etiketi:
 *   Whisper kullanılmadığında (cursor modu) her kart
 *   "Sınırlı zamanlama — karaoke highlight çalışmaz" uyarısını gösterir.
 *   Bu uyarı yalnızca timingMode prop'u "cursor" ise görünür.
 */

import { useEffect, useState } from "react";

// Backend subtitle-contracts.ts ile uyumlu tip — drift guard
export type SubtitlePresetId =
  | "clean_white"
  | "bold_yellow"
  | "minimal_dark"
  | "gradient_glow"
  | "outline_only";

export type TimingMode = "whisper_word" | "whisper_segment" | "cursor";

export interface SubtitlePresetOption {
  preset_id: string;
  label: string;
  font_size: number;
  font_weight: string;
  text_color: string;
  active_color: string;
  background: string;
  outline_width: number;
  outline_color: string;
  line_height: number;
  is_default: boolean;
  timing_note: string;
}

interface SubtitleStylePickerProps {
  /** Seçili preset_id. */
  value: string;
  /** Seçim değiştiğinde çağrılır. */
  onChange: (presetId: string) => void;
  /** Mevcut timing modu — degrade uyarısı için. */
  timingMode?: TimingMode;
  /** Preset listesi — /api/v1/modules/standard-video/subtitle-presets'ten yüklenir. */
  presets?: SubtitlePresetOption[];
  /** Yüklenme durumu. */
  loading?: boolean;
  /** Yükleme hatası. */
  error?: string | null;
}

// Örnek karaoke metni — stil kartında gösterilir
const SAMPLE_WORDS = ["İçerik", "üretim", "platformu"];
const SAMPLE_ACTIVE_WORD = "üretim";

/** Outline text-shadow CSS string'i üretir. */
function buildOutlineShadow(width: number, color: string): string | undefined {
  if (width <= 0) return undefined;
  const w = width;
  return (
    `${w}px ${w}px 0 ${color},` +
    `-${w}px ${w}px 0 ${color},` +
    `${w}px -${w}px 0 ${color},` +
    `-${w}px -${w}px 0 ${color}`
  );
}

/** Tek bir altyazı stil kartı. */
function SubtitleStyleCard({
  preset,
  isSelected,
  timingMode,
  onClick,
}: {
  preset: SubtitlePresetOption;
  isSelected: boolean;
  timingMode?: TimingMode;
  onClick: () => void;
}) {
  const isDegraded = timingMode === "cursor";

  const cardStyle: React.CSSProperties = {
    border: isSelected ? "2px solid #3b82f6" : "2px solid #e2e8f0",
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    background: isSelected ? "#eff6ff" : "#ffffff",
    transition: "border-color 0.15s, background 0.15s",
    position: "relative",
  };

  const previewBoxStyle: React.CSSProperties = {
    background: preset.background !== "none" ? preset.background : "#1e293b",
    borderRadius: "4px",
    padding: "8px 10px",
    marginBottom: "8px",
    minHeight: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const textOutline = buildOutlineShadow(preset.outline_width, preset.outline_color);

  const baseTextStyle: React.CSSProperties = {
    fontSize: `${Math.min(preset.font_size * 0.5, 18)}px`,
    fontWeight: preset.font_weight as React.CSSProperties["fontWeight"],
    lineHeight: preset.line_height,
    textShadow: textOutline,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "2px",
  };

  const defaultBadgeStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: "0.625rem",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "3px",
    padding: "1px 5px",
    marginLeft: "6px",
    verticalAlign: "middle",
  };

  const degradedWarningStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    color: "#b45309",
    background: "#fef3c7",
    borderRadius: "3px",
    padding: "2px 6px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const selectedMarkStyle: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={cardStyle} onClick={onClick} role="button" aria-pressed={isSelected} tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" || e.key === " " ? onClick() : undefined}
    >
      {isSelected && (
        <div style={selectedMarkStyle}>
          <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Önizleme kutusu — CSS tabanlı, Remotion gerektirmez */}
      {/* PREVIEW: Bu CSS render — final Remotion çıktısının yaklaşık önizlemesidir */}
      <div style={previewBoxStyle} title="Stil önizlemesi (CSS tabanlı — final Remotion çıktısından farklı olabilir)">
        <span>
          {SAMPLE_WORDS.map((word, i) => (
            <span
              key={i}
              style={{
                ...baseTextStyle,
                color: word === SAMPLE_ACTIVE_WORD ? preset.active_color : preset.text_color,
              }}
            >
              {word}{i < SAMPLE_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
      </div>

      {/* Stil etiketi */}
      <div style={labelStyle}>
        {preset.label}
        {preset.is_default && <span style={defaultBadgeStyle}>varsayılan</span>}
      </div>

      {/* Önizleme notu — preview vs final ayrımı */}
      <div style={{ fontSize: "0.625rem", color: "#94a3b8", marginBottom: "2px" }}>
        Önizleme — final video farklı görünebilir
      </div>

      {/* Degrade mod uyarısı — cursor modunda görünür */}
      {isDegraded && (
        <div style={degradedWarningStyle}>
          <span>⚠</span>
          <span>Sınırlı zamanlama — karaoke highlight çalışmaz</span>
        </div>
      )}
    </div>
  );
}

/**
 * Altyazı stil seçici — preset listesinden görsel seçim.
 *
 * Preset listesi prop olarak geçilir; yükleme/hata durumları parent tarafından yönetilir.
 * timingMode="cursor" ise tüm kartlarda degrade uyarısı gösterilir.
 */
export function SubtitleStylePicker({
  value,
  onChange,
  timingMode,
  presets = [],
  loading = false,
  error = null,
}: SubtitleStylePickerProps) {
  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "10px",
    marginTop: "8px",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#475569",
    marginBottom: "6px",
  };

  const scopeNoteStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    color: "#94a3b8",
    marginBottom: "8px",
    fontStyle: "italic",
  };

  if (loading) {
    return (
      <div>
        <div style={sectionLabelStyle}>Altyazı Stili</div>
        <div style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>Stiller yükleniyor…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div style={sectionLabelStyle}>Altyazı Stili</div>
        <div style={{ color: "#dc2626", fontSize: "0.8125rem" }}>
          Stiller yüklenemedi: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={sectionLabelStyle}>Altyazı Stili</div>
      {/* Kapsam notu — M4-C3 subtitle-specific preview sınırı */}
      <div style={scopeNoteStyle}>
        Stil kartları CSS önizlemesidir. Final video Remotion ile render edilir.
      </div>

      {/* Degrade mod uyarısı — genel, tüm kartların üzerinde */}
      {timingMode === "cursor" && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "4px",
          padding: "6px 10px",
          marginBottom: "8px",
          fontSize: "0.8125rem",
          color: "#92400e",
        }}>
          ⚠ Whisper entegrasyonu aktif değil — sınırlı zamanlama modu (cursor).
          Karaoke kelime highlight bu videoda çalışmayacak.
          Stil seçimi geçerli, ancak aktif kelime vurgusu olmaz.
        </div>
      )}

      <div style={containerStyle}>
        {presets.map((preset) => (
          <SubtitleStyleCard
            key={preset.preset_id}
            preset={preset}
            isSelected={value === preset.preset_id}
            timingMode={timingMode}
            onClick={() => onChange(preset.preset_id)}
          />
        ))}
      </div>
    </div>
  );
}
