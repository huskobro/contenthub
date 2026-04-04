/**
 * Remotion composition kayıt kökü — M6-C1.
 *
 * Tüm composition'lar burada kayıt edilir.
 * Güvenli composition mapping kuralı: yeni composition eklemek için
 * bu dosyaya açık kayıt yapılmalı ve composition_map.py ile senkronize tutulmalıdır.
 *
 * Mevcut composition'lar:
 *   StandardVideo — standard_video modülü için
 *
 * Zod şema kullanılmaz — props doğrudan TypeScript tipi ile tanımlanır.
 * Remotion v4'te şema zorunlu değildir; defaultProps ile type-safe kayıt yapılır.
 */

import React from "react";
import { Composition } from "remotion";
import {
  StandardVideoComposition,
  type StandardVideoProps,
} from "./compositions/StandardVideoComposition";

// Remotion v4: Zod kullanılmayan kayıtlar için ComponentType cast.
// Güvenli: defaultProps tam tipli, runtime davranışı değişmez.
const StandardVideoComponent =
  StandardVideoComposition as unknown as React.ComponentType<Record<string, unknown>>;

const defaultStandardVideoProps: StandardVideoProps = {
  title: "",
  scenes: [],
  subtitles_srt: null,
  word_timing_path: null,
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

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="StandardVideo"
        component={StandardVideoComponent}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultStandardVideoProps as unknown as Record<string, unknown>}
      />
    </>
  );
}
