/**
 * Remotion composition kayıt kökü — M6-C2.
 *
 * Tüm composition'lar burada kayıt edilir.
 * Güvenli composition mapping kuralı: yeni composition eklemek için
 * bu dosyaya açık kayıt yapılmalı ve composition_map.py ile senkronize tutulmalıdır.
 *
 * Mevcut composition'lar:
 *   StandardVideo     — standard_video modülü için (final render)
 *   PreviewFrame      — renderStill preview için (final render'dan ayrı, M6-C2)
 *
 * Dynamic duration (M6-C2):
 *   calculateMetadata: total_duration_seconds × fps → durationInFrames.
 *   M6-C1'deki sabit 1800 frame kaldırıldı.
 *   Kaynak: composition_props.json → props.total_duration_seconds (backend üretir).
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
          // total_duration_seconds props'tan — backend composition.py üretir.
          // Kaynak: composition_props.json → props.total_duration_seconds
          const typed = props as unknown as StandardVideoProps;
          const totalSecs = typed.total_duration_seconds ?? 60;
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
