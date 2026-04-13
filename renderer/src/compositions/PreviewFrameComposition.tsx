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
  /** Faz2: Arka plan rengi — final render ile senkron. */
  bgColor?: string;
  /** Faz2: Gradient yoğunluğu — final render ile senkron. */
  gradientIntensity?: number;
  /** Faz2: Watermark metni. */
  watermarkText?: string;
  /** Faz2: Watermark opacity. */
  watermarkOpacity?: number;
  /** Faz2: Watermark konumu. */
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Faz2: Subtitle font ailesi. */
  subtitleFontFamily?: string;
  /** Faz2: Title overlay göster. */
  showTitleOverlay?: boolean;
  /** Faz2: Başlık metni. */
  title?: string;
  /** Faz2: Başlık rengi. */
  titleColor?: string;
  /** Faz2: Portrait mod. */
  isPortrait?: boolean;
}

// ---------------------------------------------------------------------------
// Preview composition
// ---------------------------------------------------------------------------

export function PreviewFrameComposition(props: PreviewFrameProps) {
  const {
    image_path,
    subtitle_style,
    sample_text,
    bgColor = "#0a0a0a",
    gradientIntensity = 0.65,
    watermarkText,
    watermarkOpacity = 0.3,
    watermarkPosition = "bottom-right",
    subtitleFontFamily,
    showTitleOverlay = false,
    title,
    titleColor = "#FFFFFF",
    isPortrait = false,
  } = props;

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

  const gi = Math.max(0, Math.min(1, gradientIntensity));

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
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

      {/* Gradient overlay — final render ile senkron */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: isPortrait ? "45%" : "35%",
        background: `linear-gradient(to top, rgba(0,0,0,${gi.toFixed(2)}) 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* Title overlay — final render ile senkron */}
      {showTitleOverlay && title && (
        <div style={{
          position: "absolute",
          top: isPortrait ? "4%" : "4%",
          left: isPortrait ? "5%" : "3%",
          right: isPortrait ? "5%" : "40%",
          fontSize: isPortrait ? 30 : 26,
          fontWeight: "700",
          color: titleColor,
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          lineHeight: 1.3,
          textAlign: isPortrait ? "center" : "left",
          pointerEvents: "none",
        }}>
          {title}
        </div>
      )}

      {/* Watermark — final render ile senkron */}
      {watermarkText && (
        <div style={{
          position: "absolute",
          ...(watermarkPosition?.includes("top") ? { top: "3%" } : { bottom: "3%" }),
          ...(watermarkPosition?.includes("left") ? { left: "3%" } : { right: "3%" }),
          opacity: watermarkOpacity,
          fontSize: 14,
          fontWeight: "600",
          color: "#FFFFFF",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          letterSpacing: "0.06em",
          pointerEvents: "none",
        }}>
          {watermarkText}
        </div>
      )}

      {/* Örnek altyazı — stil önizlemesi için */}
      <KaraokeSubtitle
        wordTimings={sampleWordTimings}
        style={subtitle_style}
        timingMode="whisper_segment"
        totalDurationSeconds={1}
        isPortrait={isPortrait}
        fontFamily={subtitleFontFamily}
      />
    </AbsoluteFill>
  );
}
