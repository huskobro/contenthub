/**
 * NewsBulletin composition bileseni — M31.
 *
 * composition_props.json'dan gelen props ile haber bulteni video render eder.
 * Guvenli composition mapping: composition_map.py icindeki "NewsBulletin" ID ile eslesir.
 *
 * Props kaynagi:
 *   backend/app/modules/news_bulletin/executors/composition.py -> composition_props.json
 *   backend RenderStepExecutor -> word_timing.json okunur -> wordTimings inline gecirilir
 *
 * V1 Combined Render:
 *   Tum haberler tek video icinde sirayla render edilir.
 *   Her haber arasinda basit cut gecis.
 *   Haber basligi overlay olarak gosterilir.
 *   Narration ses olarak calar, altyazi senkron gosterilir.
 *
 * M30 SubtitleStyle preset format uyumu:
 *   subtitleStyle artik backend get_preset_for_composition() ciktisiyla uyumlu tam preset nesnesi.
 *   Eski format (fontColor/backgroundColor/position) geriye donuk uyumlulukla desteklenir.
 *
 * M31 eklemeleri:
 *   - lowerThirdStyle prop: BulletinLowerThird component ile lower-third bant
 *   - renderMode prop: combined/per_category/per_item — UI rozeti gosterimi (cok-cikti backend-tarafli)
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useVideoConfig,
} from "remotion";
import { BulletinLowerThird } from "../components/BulletinLowerThird";

// ---------------------------------------------------------------------------
// Props tipleri — composition_props.json -> props alaniyla uyumlu
// ---------------------------------------------------------------------------

export interface BulletinItemProps {
  itemNumber: number;
  headline: string;
  narration: string;
  audioPath: string | null;
  imagePath: string | null;
  durationSeconds: number;
  category?: string;
}

/**
 * M30 preset format — backend get_preset_for_composition() ciktisiyla uyumlu.
 * Eski alanlar (fontColor, backgroundColor, position) geriye donuk uyumluluk icin
 * opsiyonel tutulur; yeni alanlar onceliklidir.
 */
export interface SubtitleStyle {
  preset_id: string;
  label?: string;
  // M30 yeni alanlar (oncelikli)
  font_size?: number;
  font_weight?: string;
  text_color?: string;
  active_color?: string;
  background?: string;
  outline_width?: number;
  outline_color?: string;
  line_height?: number;
  preset_fallback_used?: boolean;
  // Eski alanlar (geriye donuk uyumluluk)
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: string;
}

export interface NewsBulletinProps {
  bulletinTitle: string;
  items: BulletinItemProps[];
  subtitlesSrt: string | null;
  wordTimingPath?: string | null;
  /** Kelime zamanlama verisi — backend word_timing.json'dan okuyup inline gecirir. */
  wordTimings?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  timingMode: "cursor" | "whisper_word" | "whisper_segment";
  subtitleStyle: SubtitleStyle;
  totalDurationSeconds: number;
  language: string;
  /** M31: lower-third bant stili (broadcast | minimal | modern). Null ise gosterilmez. */
  lowerThirdStyle?: string | null;
  /** M31: Render modu — UI rozeti icin. Cok-cikti uretimi backend-taraflidir. */
  renderMode?: "combined" | "per_category" | "per_item" | null;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags?: string[];
  };
}

// ---------------------------------------------------------------------------
// SubtitleStyle alan cozumleme yardimcilari
// M30 format oncelikli; eksik alanda eski format'a fallback.
// ---------------------------------------------------------------------------

function resolveTextColor(s: SubtitleStyle): string {
  return s.text_color ?? s.fontColor ?? "#FFFFFF";
}

function resolveBackground(s: SubtitleStyle): string {
  return s.background ?? s.backgroundColor ?? "rgba(0,0,0,0.7)";
}

function resolveFontSize(s: SubtitleStyle): number {
  return s.font_size ?? s.fontSize ?? 36;
}

function resolveFontWeight(s: SubtitleStyle): string {
  return s.font_weight ?? "400";
}

function resolveLineHeight(s: SubtitleStyle): number {
  return s.line_height ?? 1.4;
}

function resolveOutlineWidth(s: SubtitleStyle): number {
  return s.outline_width ?? 0;
}

function resolveOutlineColor(s: SubtitleStyle): string {
  return s.outline_color ?? "#000000";
}

/**
 * outline_width > 0 ise metin golge (outline efekti) CSS degerini dondurur.
 * 0 ise bos string (no-op).
 */
function buildTextShadow(s: SubtitleStyle): string {
  const width = resolveOutlineWidth(s);
  if (width <= 0) return "";
  const color = resolveOutlineColor(s);
  const w = width;
  return `${-w}px ${-w}px 0 ${color}, ${w}px ${-w}px 0 ${color}, ${-w}px ${w}px 0 ${color}, ${w}px ${w}px 0 ${color}`;
}

// ---------------------------------------------------------------------------
// renderMode rozet etiketi
// ---------------------------------------------------------------------------

function renderModeLabel(mode: string): string {
  if (mode === "per_category") return "Kategori Bazli";
  if (mode === "per_item") return "Haber Bazli";
  return mode;
}

// ---------------------------------------------------------------------------
// Varsayilan props (Remotion Studio icin)
// ---------------------------------------------------------------------------

export const defaultNewsBulletinProps: NewsBulletinProps = {
  bulletinTitle: "Haber Bulteni",
  items: [
    {
      itemNumber: 1,
      headline: "Ornek Haber Basligi",
      narration: "Bu bir ornek narration metnidir.",
      audioPath: null,
      imagePath: null,
      durationSeconds: 10,
      category: "genel",
    },
  ],
  subtitlesSrt: null,
  wordTimings: [],
  timingMode: "cursor",
  subtitleStyle: {
    preset_id: "clean_white",
    font_size: 36,
    font_weight: "600",
    text_color: "#FFFFFF",
    active_color: "#FFD700",
    background: "rgba(0,0,0,0.35)",
    outline_width: 2,
    outline_color: "#000000",
    line_height: 1.4,
  },
  totalDurationSeconds: 10,
  language: "tr",
  lowerThirdStyle: null,
  renderMode: null,
  metadata: {
    title: "Ornek Bulten",
    description: "Ornek bulten aciklamasi",
    tags: ["haber", "gundem"],
    hashtags: ["#haber"],
  },
};

// ---------------------------------------------------------------------------
// Composition bileseni
// ---------------------------------------------------------------------------

export const NewsBulletinComposition: React.FC<NewsBulletinProps> = (props) => {
  const { fps } = useVideoConfig();
  const {
    items,
    bulletinTitle,
    subtitleStyle,
    lowerThirdStyle,
    renderMode,
  } = props;

  // Narration kutusu stil hesaplamalari
  const textColor = resolveTextColor(subtitleStyle);
  const background = resolveBackground(subtitleStyle);
  const fontSize = resolveFontSize(subtitleStyle);
  const fontWeight = resolveFontWeight(subtitleStyle);
  const lineHeight = resolveLineHeight(subtitleStyle);
  const textShadow = buildTextShadow(subtitleStyle);

  // renderMode rozet gosterimi: "combined" ve null gosterilmez
  const showRenderModeBadge =
    renderMode != null && renderMode !== "combined";

  // Her item icin frame offset hesapla
  let currentFrame = 0;
  const itemSequences = items.map((item, index) => {
    const durationFrames = Math.max(
      Math.round(item.durationSeconds * fps),
      fps, // Minimum 1 saniye
    );
    const startFrame = currentFrame;
    currentFrame += durationFrames;

    const hasLowerThird = lowerThirdStyle != null && lowerThirdStyle !== "";

    return (
      <Sequence
        key={`item-${item.itemNumber}`}
        from={startFrame}
        durationInFrames={durationFrames}
        name={`Haber ${item.itemNumber}`}
      >
        <AbsoluteFill
          style={{
            backgroundColor: "#1a1a2e",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: 60,
          }}
        >
          {/* Haber numarasi badge */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              backgroundColor: "#e94560",
              color: "#FFFFFF",
              padding: "8px 20px",
              borderRadius: 4,
              fontSize: 18,
              fontWeight: "bold",
              fontFamily: "sans-serif",
            }}
          >
            {index + 1} / {items.length}
          </div>

          {/* renderMode rozeti — top-center, sadece non-combined modlarda */}
          {showRenderModeBadge && (
            <div
              style={{
                position: "absolute",
                top: 40,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(37,99,235,0.85)",
                color: "#FFFFFF",
                padding: "5px 14px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: "600",
                fontFamily: "sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {renderModeLabel(renderMode!)}
            </div>
          )}

          {/* Baslik */}
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: 48,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              textAlign: "center",
              lineHeight: 1.3,
              maxWidth: "80%",
              margin: 0,
            }}
          >
            {item.headline}
          </h2>

          {/* Narration metni (altyazi olarak) */}
          <div
            style={{
              position: "absolute",
              bottom: hasLowerThird ? 88 : 80, // lower-third varsa biraz yukari kaydir
              left: 40,
              right: 40,
              backgroundColor: background,
              color: textColor,
              fontSize: fontSize,
              fontWeight: fontWeight,
              fontFamily: "sans-serif",
              padding: "16px 24px",
              borderRadius: 8,
              textAlign: "center",
              lineHeight: lineHeight,
              ...(textShadow ? { textShadow } : {}),
            }}
          >
            {item.narration}
          </div>

          {/* Kategori etiketi */}
          {item.category && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 40,
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#FFFFFF",
                padding: "6px 16px",
                borderRadius: 4,
                fontSize: 14,
                fontFamily: "sans-serif",
                textTransform: "uppercase",
              }}
            >
              {item.category}
            </div>
          )}

          {/* Lower-third bant — narration kutusunun uzerinde, ekranin alt kismi */}
          {hasLowerThird && (
            <BulletinLowerThird
              headline={item.headline}
              category={item.category}
              itemNumber={item.itemNumber}
              totalItems={items.length}
              style={lowerThirdStyle}
            />
          )}

          {/* Audio */}
          {item.audioPath && (
            <Audio src={item.audioPath} />
          )}
        </AbsoluteFill>
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f23" }}>
      {/* Bulten basligi (ilk 2 saniye) */}
      <Sequence from={0} durationInFrames={fps * 2} name="Bulten Basligi">
        <AbsoluteFill
          style={{
            backgroundColor: "#16213e",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            {bulletinTitle}
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* Haber item'lari — title'dan sonra baslar */}
      <Sequence from={fps * 2} name="Haberler">
        <AbsoluteFill>
          {itemSequences}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
