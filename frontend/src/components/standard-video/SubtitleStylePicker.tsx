/**
 * Subtitle stil secici — M4-C3 preview-first UI.
 *
 * Her preset icin bir stil karti gosterir. Stil karti:
 *   - Preset'in renklerini, font agirligini, arka planini CSS ile inline onizler.
 *   - Ornek bir karaoke satiri gosterir (aktif kelime active_color ile).
 *   - Timing degrade uyarisini gorunur kilar.
 *
 * KAPSAM NOTU (M4-C3):
 *   Bu component yalnizca subtitle stil secimi icin preview sunar.
 *   M6 genel preview altyapisina (kompozisyon preview, Remotion renderStill) dahil degildir.
 *   Stil karti CSS-tabanlidir — Remotion gerektirmez.
 *
 * Preview artifact vs final artifact ayrimi:
 *   - Bu component bir PREVIEW gosterir (CSS inline render).
 *   - Final artifact: Remotion render ciktisi (M6'da aktif).
 *   - Preview ve final birbirinin yerini tutmaz; UI'da acikca etiketlenmistir.
 *
 * Degrade mod etiketi:
 *   Whisper kullanilmadiginda (cursor modu) her kart
 *   "Sinirli zamanlama — karaoke highlight calismaz" uyarisini gosterir.
 *   Bu uyari yalnizca timingMode prop'u "cursor" ise gorunur.
 */

import { cn } from "../../lib/cn";

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
  /** Secili preset_id. */
  value: string;
  /** Secim degistiginde cagirilir. */
  onChange: (presetId: string) => void;
  /** Mevcut timing modu — degrade uyarisi icin. */
  timingMode?: TimingMode;
  /** Preset listesi — /api/v1/modules/standard-video/subtitle-presets'ten yuklenir. */
  presets?: SubtitlePresetOption[];
  /** Yuklenme durumu. */
  loading?: boolean;
  /** Yukleme hatasi. */
  error?: string | null;
}

// Ornek karaoke metni — stil kartinda gosterilir
const SAMPLE_WORDS = ["Icerik", "uretim", "platformu"];
const SAMPLE_ACTIVE_WORD = "uretim";

/** Outline text-shadow CSS string'i uretir. */
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

/** Tek bir altyazi stil karti. */
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
  const textOutline = buildOutlineShadow(preset.outline_width, preset.outline_color);

  return (
    <div
      className={cn(
        "rounded-lg p-3 cursor-pointer relative transition-all duration-150",
        isSelected
          ? "border-2 border-brand-500 bg-info-light"
          : "border-2 border-border-subtle bg-neutral-0 hover:border-brand-300",
      )}
      onClick={onClick}
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" || e.key === " " ? onClick() : undefined}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
          <span className="text-neutral-0 text-[10px] leading-none">&#10003;</span>
        </div>
      )}

      {/* Onizleme kutusu — CSS tabanli, Remotion gerektirmez */}
      {/* PREVIEW: Bu CSS render — final Remotion ciktisinin yaklasik onizlemesidir */}
      <div
        className="rounded-sm py-2 px-2.5 mb-2 min-h-[40px] flex items-center justify-center"
        style={{
          background: preset.background !== "none" ? preset.background : undefined,
        }}
        title="Stil onizlemesi (CSS tabanli — final Remotion ciktsindan farkli olabilir)"
      >
        <span>
          {SAMPLE_WORDS.map((word, i) => (
            <span
              key={i}
              style={{
                fontSize: `${Math.min(preset.font_size * 0.5, 18)}px`,
                fontWeight: preset.font_weight as React.CSSProperties["fontWeight"],
                lineHeight: preset.line_height,
                textShadow: textOutline,
                color: word === SAMPLE_ACTIVE_WORD ? preset.active_color : preset.text_color,
              }}
            >
              {word}{i < SAMPLE_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
      </div>

      {/* Stil etiketi */}
      <div className="text-sm font-semibold text-neutral-800 mb-0.5">
        {preset.label}
        {preset.is_default && (
          <span className="inline-block text-[0.625rem] bg-info-light text-info-dark rounded-sm py-px px-1.5 ml-1.5 align-middle">
            varsayilan
          </span>
        )}
      </div>

      {/* Onizleme notu — preview vs final ayrimi */}
      <div className="text-[0.625rem] text-neutral-500 mb-0.5">
        Onizleme — final video farkli gorunebilir
      </div>

      {/* Degrade mod uyarisi — cursor modunda gorunur */}
      {isDegraded && (
        <div className="text-xs text-warning-text bg-warning-light rounded-sm py-0.5 px-1.5 mt-1 flex items-center gap-1">
          <span>&#9888;</span>
          <span>Sinirli zamanlama — karaoke highlight calismaz</span>
        </div>
      )}
    </div>
  );
}

/**
 * Altyazi stil secici — preset listesinden gorsel secim.
 *
 * Preset listesi prop olarak gecilir; yukleme/hata durumlari parent tarafindan yonetilir.
 * timingMode="cursor" ise tum kartlarda degrade uyarisi gosterilir.
 */
export function SubtitleStylePicker({
  value,
  onChange,
  timingMode,
  presets = [],
  loading = false,
  error = null,
}: SubtitleStylePickerProps) {
  if (loading) {
    return (
      <div>
        <div className="text-base font-medium text-neutral-700 mb-1.5">Altyazi Stili</div>
        <div className="text-neutral-500 text-base">Stiller yukleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-base font-medium text-neutral-700 mb-1.5">Altyazi Stili</div>
        <div className="text-error-base text-base">
          Stiller yuklenemedi: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-base font-medium text-neutral-700 mb-1.5">Altyazi Stili</div>
      {/* Kapsam notu — M4-C3 subtitle-specific preview siniri */}
      <div className="text-xs text-neutral-500 mb-2 italic">
        Stil kartlari CSS onizlemesidir. Final video Remotion ile render edilir.
      </div>

      {/* Degrade mod uyarisi — genel, tum kartlarin uzerinde */}
      {timingMode === "cursor" && (
        <div className="bg-warning-light border border-warning-base rounded-sm py-1.5 px-2.5 mb-2 text-base text-warning-text">
          &#9888; Whisper entegrasyonu aktif degil — sinirli zamanlama modu (cursor).
          Karaoke kelime highlight bu videoda calismayacak.
          Stil secimi gecerli, ancak aktif kelime vurgusu olmaz.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 mt-2">
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
