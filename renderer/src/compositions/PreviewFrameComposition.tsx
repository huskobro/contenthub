/**
 * PreviewFrame composition bileşeni — M6-C2.
 *
 * renderStill için tek kare önizleme üretir.
 * Final render'dan TAMAMEN AYRI bir composition — ID: "PreviewFrame".
 *
 * Amaç:
 *   - Subtitle stil önizlemesi (örnek metin + stil)
 *   - Sahne görsel önizlemesi (image_path + sahne içeriği)
 *   - Wizard stil seçimi için preview-first UX
 *
 * Kullanım sınırları:
 *   - Bu composition ile video render edilmez (durationInFrames=1).
 *   - renderStill → output.jpg (tek kare JPEG).
 *   - M4-C3 CSS preview'dan FARKLI: bu Remotion tabanlı, CSS render değil.
 *   - Final render'ın alt kümesidir, onunla karıştırılmamalıdır.
 *
 * Preview scope ayrımı:
 *   M4-C3 CSS preview → frontend stil kartları (metin tabanlı, browser CSS)
 *   M6-C2 renderStill  → Remotion single frame (pixel output, JPEG)
 *   Bu iki yüzey birbirinin yerini almaz.
 */

import { AbsoluteFill, Img } from "remotion";
import type { SubtitleStylePreset } from "../shared/subtitle-contracts";
import { KaraokeSubtitle } from "./KaraokeSubtitle";

// ---------------------------------------------------------------------------
// Props tipi
// ---------------------------------------------------------------------------

export interface PreviewFrameProps {
  /** Hangi sahne önizlenecek (1-indexed). */
  scene_number: number;
  /** Sahne arka plan görseli yolu — null ise siyah arka plan. */
  image_path: string | null;
  /** Önizlenecek altyazı stil preset. */
  subtitle_style: SubtitleStylePreset;
  /** Stil önizlemesi için örnek metin. */
  sample_text: string;
}

// ---------------------------------------------------------------------------
// Preview composition
// ---------------------------------------------------------------------------

export function PreviewFrameComposition(props: PreviewFrameProps) {
  const { image_path, subtitle_style, sample_text } = props;

  // Tek kelime timing — örnek metin için cursor modu yeterli.
  // PreviewFrame kelime-düzeyi highlight yapmaz; stil görünümünü gösterir.
  const sampleWordTimings = [
    {
      scene: 1,
      word: sample_text,
      start: 0,
      end: 1,
      probability: 1.0,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Arka plan görseli */}
      {image_path && (
        <Img
          src={image_path}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Örnek altyazı — stil önizlemesi için */}
      <KaraokeSubtitle
        wordTimings={sampleWordTimings}
        style={subtitle_style}
        timingMode="whisper_segment"
        totalDurationSeconds={1}
      />
    </AbsoluteFill>
  );
}
