/**
 * Remotion composition kayıt kökü — M6-C3.
 *
 * Tüm composition'lar burada kayıt edilir.
 * Güvenli composition mapping kuralı: yeni composition eklemek için
 * bu dosyaya açık kayıt yapılmalı ve composition_map.py ile senkronize tutulmalıdır.
 *
 * Mevcut composition'lar (composition_map.py ile senkron — M6-C3):
 *   StandardVideo     — standard_video modülü için (final render)
 *                       composition_map.COMPOSITION_MAP["standard_video"]
 *   PreviewFrame      — renderStill preview için (final render'dan ayrı)
 *                       composition_map.PREVIEW_COMPOSITION_MAP["standard_video_preview"]
 *
 * Dynamic duration (M6-C2, M6-C3 fallback belgesi):
 *   Authoritative kaynak: render_props.json → total_duration_seconds
 *   Üretici: backend CompositionStepExecutor
 *   Fallback: total_duration_seconds eksik/sıfır/negatif → 60 saniye.
 *   Backend tarafı bu durumu WARNING log + duration_fallback_used=true ile bildirir.
 *   Renderer tarafı: props null/undefined → 60 saniye (console.warn ile bildirilir).
 *   Sessiz fallback yok: hem backend hem renderer fallback durumu loglar.
 *
 * as unknown cast (M6-C3 audit):
 *   Bu dosyada 5 gerçek cast var (2 component + 2 defaultProps + 1 calculateMetadata).
 *   Remotion v4 Zod-less kayıt için gerekli sınırlama — yayılmamalı.
 *   Yeni composition eklemek 2 cast daha gerektirir (component + defaultProps).
 *   Bu sayı artarsa alarm verilmeli.
 *
 * Zod şema kullanılmaz — props doğrudan TypeScript tipi ile tanımlanır.
 */

import React from "react";
import { Composition } from "remotion";
import {
  StandardVideoComposition,
  type StandardVideoProps,
} from "./compositions/StandardVideoComposition";
import {
  PreviewFrameComposition,
  type PreviewFrameProps,
} from "./compositions/PreviewFrameComposition";

const FPS = 30;

// Remotion v4: Zod kullanılmayan kayıtlar için ComponentType cast.
const StandardVideoComponent =
  StandardVideoComposition as unknown as React.ComponentType<Record<string, unknown>>;

const PreviewFrameComponent =
  PreviewFrameComposition as unknown as React.ComponentType<Record<string, unknown>>;

// ---------------------------------------------------------------------------
// StandardVideo defaultProps
// ---------------------------------------------------------------------------

const defaultStandardVideoProps: StandardVideoProps = {
  title: "",
  scenes: [],
  subtitles_srt: null,
  wordTimings: [],
  timing_mode: "cursor",
  subtitle_style: {
    preset_id: "clean_white",
    label: "Clean White",
    font_size: 48,
    font_weight: "600",
    text_color: "#ffffff",
    active_color: "#ffdd00",
    background: "rgba(0,0,0,0.5)",
    outline_width: 0,
    outline_color: "#000000",
    line_height: 1.4,
  },
  total_duration_seconds: 60,
  language: "tr",
  metadata: {
    title: "",
    description: "",
    tags: [],
    hashtags: [],
  },
};

// ---------------------------------------------------------------------------
// PreviewFrame defaultProps
// ---------------------------------------------------------------------------

const defaultPreviewFrameProps: PreviewFrameProps = {
  scene_number: 1,
  image_path: null,
  subtitle_style: defaultStandardVideoProps.subtitle_style,
  sample_text: "Önizleme",
};

// ---------------------------------------------------------------------------
// Root bileşeni
// ---------------------------------------------------------------------------

export function RemotionRoot() {
  return (
    <>
      {/* Final render composition */}
      <Composition
        id="StandardVideo"
        component={StandardVideoComponent}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          defaultStandardVideoProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          // Authoritative kaynak: render_props.json → total_duration_seconds
          // Üretici: backend CompositionStepExecutor
          // Fallback: eksik/sıfır/negatif → 60 saniye + console.warn
          const typed = props as unknown as StandardVideoProps;
          const raw = typed.total_duration_seconds;
          const FALLBACK_SECS = 60;
          let totalSecs: number;
          if (typeof raw !== "number" || raw <= 0) {
            console.warn(
              `[Root.tsx] total_duration_seconds geçersiz (${raw}). ` +
              `Fallback=${FALLBACK_SECS}s kullanılıyor. ` +
              `Bu durum backend composition artifact sorununa işaret edebilir.`
            );
            totalSecs = FALLBACK_SECS;
          } else {
            totalSecs = raw;
          }
          const durationInFrames = Math.max(1, Math.round(totalSecs * FPS));
          return { durationInFrames };
        }}
      />

      {/* Preview composition — renderStill için, final render'dan ayrı */}
      <Composition
        id="PreviewFrame"
        component={PreviewFrameComponent}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          defaultPreviewFrameProps as unknown as Record<string, unknown>
        }
      />
    </>
  );
}
