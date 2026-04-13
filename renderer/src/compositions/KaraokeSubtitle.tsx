/**
 * Karaoke altyazı Remotion composition component'ı — M42.
 *
 * Gerçek kelime-düzeyi highlight + animasyon preset sistemi.
 * word_timing.json artifact'ından gelen WordTiming verisini tüketir.
 *
 * Animasyon preset sistemi (ContentHub-native):
 *   hype      : zoom_in (0.8→1.05→1.0), gri→sarı→beyaz, 4-yön stroke + glow
 *   explosive : agresif pop (0.5→1.1→1.0), altın→beyaz+ateş glow→altın
 *   vibrant   : bounce dip (0.95→0.9→1.05→1.0), yumuşak renk
 *   minimal   : scale yok, sadece renk değişimi
 *
 * Timing modu davranışı:
 *   whisper_word    → kelime bazında highlight + animasyon
 *   whisper_segment → satır bazında highlight (tüm satır active_color)
 *   cursor          → SRT tabanlı fallback: aktif subtitle satırını düz metin gösterir
 *
 * Düzeltilen bug'lar (M42):
 *   - String match yerine index-based word tracking (tekrar eden kelimeler artık doğru highlight)
 *   - Segment entrance animasyonu (slide-up 12px + fade-in 5 frame)
 *   - 3-state word rengi: future(soluk) / active(vurgulu) / past(belirgin)
 *   - Safe interpolate: sıfır-uzunluklu word'lerde crash yok
 *   - fontWeight + letterSpacing aktif word'de artırılır
 *
 * Stil kontrolü:
 *   SubtitleStylePreset'ten gelir. animPreset ayrı parametre olarak geçirilir.
 *   SubtitleStylePreset.active_color → karaoke highlight rengi.
 *
 * M41c: Portrait layout desteği (font boyutu, konum).
 * M41c: Cursor modunda SRT parse fallback.
 */

import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import type {
  WordTiming,
  SubtitleStylePreset,
  TimingMode,
  KaraokeRenderBehavior,
  KaraokeAnimPreset,
} from "../shared/subtitle-contracts";
import { resolveKaraokeRenderBehavior } from "../shared/subtitle-contracts";

// ---------------------------------------------------------------------------
// Prop tipleri
// ---------------------------------------------------------------------------

export interface KaraokeSubtitleProps {
  /** Kelime zamanlama verisi — word_timing.json'dan yüklenir. */
  wordTimings: WordTiming[];
  /** Subtitle stil preset — composition_props.json'daki subtitle_style alanından gelir. */
  style: SubtitleStylePreset;
  /** Zamanlama modu — render davranışını belirler. */
  timingMode: TimingMode;
  /** Videonun toplam süresi (saniye). */
  totalDurationSeconds: number;
  /** M41c: SRT formatında altyazı metni — cursor modda fallback olarak kullanılır. */
  subtitlesSrt?: string | null;
  /** M41c: Portrait layout flag — font boyutu ve konumu ayarlar. */
  isPortrait?: boolean;
  /**
   * Karaoke animasyon preset.
   * hype | explosive | vibrant | minimal
   * Default: "hype"
   */
  animPreset?: KaraokeAnimPreset;
  /** B2: Admin panelden kontrol edilen font ailesi. Varsayılan: "inherit". */
  fontFamily?: string;
}

// ---------------------------------------------------------------------------
// SRT Parser — cursor mod fallback
// ---------------------------------------------------------------------------

interface SrtEntry {
  startSec: number;
  endSec: number;
  text: string;
}

function parseSrt(srt: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  const blocks = srt.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/
    );
    if (!match) continue;
    const startSec =
      parseInt(match[1]) * 3600 +
      parseInt(match[2]) * 60 +
      parseInt(match[3]) +
      parseInt(match[4]) / 1000;
    const endSec =
      parseInt(match[5]) * 3600 +
      parseInt(match[6]) * 60 +
      parseInt(match[7]) +
      parseInt(match[8]) / 1000;
    const text = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) {
      entries.push({ startSec, endSec, text });
    }
  }
  return entries;
}

function findActiveSrtEntry(entries: SrtEntry[], currentTime: number): string | null {
  for (const e of entries) {
    if (currentTime >= e.startSec && currentTime < e.endSec) {
      return e.text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Yardımcı: aktif kelimeyi index ile bul
// ---------------------------------------------------------------------------

/**
 * currentTime'a göre aktif WordTiming'in index'ini döner.
 * String match yerine index kullanmak tekrar eden kelime bug'ını çözer.
 */
function findActiveWordIndex(
  words: WordTiming[],
  currentTime: number
): number {
  for (let i = 0; i < words.length; i++) {
    if (currentTime >= words[i].start && currentTime < words[i].end) {
      return i;
    }
  }
  return -1;
}

/**
 * currentTime'a göre aktif metni döner (whisper_segment modu).
 */
function findActiveSegmentText(
  words: WordTiming[],
  currentTime: number
): string | null {
  // Aktif sahneyi bul: currentTime'ı kapsayan ilk kelimeyi ara
  let activeScene: number | null = null;
  for (const w of words) {
    if (currentTime >= w.start && currentTime < w.end) {
      activeScene = w.scene;
      break;
    }
  }
  // Aktif kelime yok → en yakın sahneye bak (cümle arası boşluklar için)
  if (activeScene === null) {
    for (const w of words) {
      if (currentTime >= w.start) {
        activeScene = w.scene;
      }
    }
  }
  if (activeScene === null) return null;

  return words
    .filter((w) => w.scene === activeScene)
    .map((w) => w.word)
    .join(" ");
}

// ---------------------------------------------------------------------------
// Animasyon yardımcıları (ContentHub-native, YTRobot preset mantığından adapte)
// ---------------------------------------------------------------------------

/**
 * Güvenli interpolate: inRange[0] >= inRange[1] durumunda crash olmaz.
 */
function lerp(
  f: number,
  inRange: [number, number],
  outRange: [number, number]
): number {
  if (inRange[0] >= inRange[1]) return outRange[1];
  return interpolate(f, inRange, outRange, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/**
 * zoom_in: initScale → (1 + overshoot) → 1.0
 * peakFrac: 0.0–1.0, peak'in dur içindeki yeri
 */
function zoomIn(
  f: number,
  start: number,
  dur: number,
  initScale: number,
  overshoot: number,
  peakFrac: number
): number {
  if (dur <= 0) return 1.0;
  const peak = start + Math.max(1, Math.floor(dur * peakFrac));
  const end = start + dur;
  if (f < peak) return lerp(f, [start, peak], [initScale, 1 + overshoot]);
  return lerp(f, [peak, end], [1 + overshoot, 1.0]);
}

/**
 * pop_in: initScale → minScale (dip) → (1 + overshoot) (peak) → 1.0
 * pycaps PopInPrimitive'den adapte edilmiştir.
 */
function popIn(
  f: number,
  start: number,
  dur: number,
  initScale: number,
  minScale: number,
  minAt: number,
  overshoot: number,
  peakAt: number
): number {
  if (dur <= 0) return 1.0;
  const dipFrame  = start + Math.max(1, Math.floor(dur * minAt));
  const peakFrame = start + Math.max(2, Math.floor(dur * peakAt));
  const end = start + dur;
  if (f < dipFrame)  return lerp(f, [start, dipFrame],      [initScale, minScale]);
  if (f < peakFrame) return lerp(f, [dipFrame, peakFrame],  [minScale, 1 + overshoot]);
  return              lerp(f, [peakFrame, end],              [1 + overshoot, 1.0]);
}

// ---------------------------------------------------------------------------
// Ana component
// ---------------------------------------------------------------------------

export function KaraokeSubtitle(props: KaraokeSubtitleProps): JSX.Element {
  const {
    wordTimings,
    style,
    timingMode,
    totalDurationSeconds: _total,
    subtitlesSrt,
    isPortrait = false,
    animPreset = "hype",
    fontFamily,
  } = props;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const behavior: KaraokeRenderBehavior = resolveKaraokeRenderBehavior(timingMode);

  // M41c: Portrait layout ayarları
  const portraitFontSize = Math.round(style.font_size * 0.75);
  const fontSize = isPortrait ? portraitFontSize : style.font_size;
  const bottomPct = isPortrait ? "12%" : "10%";
  const sidePct = isPortrait ? "4%" : "5%";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: bottomPct,
    left: sidePct,
    right: sidePct,
    textAlign: "center",
    pointerEvents: "none",
  };

  const baseTextStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontWeight: style.font_weight,
    color: style.text_color,
    background: style.background !== "none" ? style.background : undefined,
    lineHeight: style.line_height,
    padding: isPortrait ? "3px 8px" : "4px 12px",
    borderRadius: "4px",
    textShadow:
      style.outline_width > 0
        ? `${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color},` +
          `-${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color},` +
          `${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color},` +
          `-${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color}`
        : undefined,
    fontFamily: fontFamily || "inherit",
  };

  // ── Cursor / degrade mod ───────────────────────────────────────────────────
  if (behavior.degraded_mode) {
    let displayText: string | null = null;
    if (subtitlesSrt) {
      const entries = parseSrt(subtitlesSrt);
      displayText = findActiveSrtEntry(entries, currentTime);
    }
    if (!displayText) return <div style={containerStyle} />;
    return (
      <div style={containerStyle}>
        <span style={baseTextStyle}>{displayText}</span>
      </div>
    );
  }

  // ── Segment mod ────────────────────────────────────────────────────────────
  if (behavior.segment_level_highlight) {
    const displayText = findActiveSegmentText(wordTimings, currentTime);
    if (!displayText) return <div style={containerStyle} />;
    return (
      <div style={containerStyle}>
        <span style={{ ...baseTextStyle, color: style.active_color }}>
          {displayText}
        </span>
      </div>
    );
  }

  // ── Whisper word mod — animasyonlu karaoke ────────────────────────────────
  if (!behavior.word_level_highlight) return <div style={containerStyle} />;

  // Aktif kelimeyi index ile bul (tekrar eden kelimelerde doğru highlight için)
  const activeWordIdx = findActiveWordIndex(wordTimings, currentTime);
  if (activeWordIdx === -1) return <div style={containerStyle} />;

  const activeWord = wordTimings[activeWordIdx];

  // Aktif sahnenin tüm kelimeleri → görüntülenecek cümle
  const sceneWords = wordTimings.filter((w) => w.scene === activeWord.scene);
  if (sceneWords.length === 0) return <div style={containerStyle} />;

  // Aktif kelimenin sceneWords içindeki index'i
  const activeInSceneIdx = sceneWords.findIndex(
    (w) => w.start === activeWord.start && w.word === activeWord.word
  );

  // Segment süresi (frame cinsinden) — entrance animasyonu için
  const sceneStartSec = sceneWords[0].start;
  const sceneEndSec   = sceneWords[sceneWords.length - 1].end;
  const segStartFrame = Math.round(sceneStartSec * fps);
  const segEndFrame   = Math.round(sceneEndSec * fps);
  const segDur = Math.max(1, segEndFrame - segStartFrame);
  const introFrames = Math.min(5, Math.floor(segDur * 0.12));

  // Segment-level entrance animasyonu: slide-up 12px + fade-in
  const groupOpacity = lerp(frame, [segStartFrame, segStartFrame + introFrames], [0, 1]);
  const groupY =
    animPreset === "explosive"
      ? 0  // explosive: yatay slide → translateX aşağıda yapılır
      : lerp(frame, [segStartFrame, segStartFrame + introFrames], [12, 0]);
  const groupX =
    animPreset === "explosive"
      ? lerp(frame, [segStartFrame, segStartFrame + introFrames], [-60, 0])
      : 0;

  const karaokeColor = style.active_color;

  return (
    <div style={containerStyle}>
      <span
        style={{
          ...baseTextStyle,
          display: "inline",
          opacity: groupOpacity,
          transform:
            animPreset === "explosive"
              ? `translateX(${groupX}px)`
              : `translateY(${groupY}px)`,
        }}
      >
        {sceneWords.map((w, idx) => {
          const wStartFrame = Math.round(w.start * fps);
          const wEndFrame   = Math.round(w.end * fps);
          const isActive = frame >= wStartFrame && frame < wEndFrame;
          const isPast   = frame >= wEndFrame;
          const wDur     = Math.max(1, wEndFrame - wStartFrame);
          const animDur  = Math.min(5, wDur);

          // ── Word-level scale animasyonu ──────────────────────────────────
          let wordScale = 1.0;
          if (isActive) {
            if (animPreset === "hype") {
              // zoom_in: 0.8 → 1.05 → 1.0
              wordScale = zoomIn(frame, wStartFrame, animDur, 0.8, 0.05, 0.7);
            } else if (animPreset === "explosive") {
              // zoom_in agresif: 0.5 → 1.1 → 1.0
              wordScale = zoomIn(frame, wStartFrame, animDur, 0.5, 0.1, 0.7);
            } else if (animPreset === "vibrant") {
              // pop_in: 0.95 → 0.9 → 1.05 → 1.0
              wordScale = popIn(frame, wStartFrame, animDur, 0.95, 0.9, 0.5, 0.05, 0.8);
            }
            // minimal: wordScale = 1.0 (değişmez)
          }

          // ── 3-state renk ve glow ─────────────────────────────────────────
          let wordColor   = style.text_color;
          let wordOpacity = 1.0;
          let wordShadow  = `0 2px 8px rgba(0,0,0,0.9)`;
          let fontWeight: string | undefined = style.font_weight;
          let letterSpacing: string | undefined = undefined;

          if (animPreset === "hype") {
            // future: soluk gri | active: karaoke rengi | past: beyaz
            wordColor   = isActive ? karaokeColor : isPast ? "#FFFFFF" : "#DDDDDD";
            wordOpacity = isActive ? 1.0 : isPast ? 0.9 : 0.45;
            wordShadow  = isActive
              ? `-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,0 0 16px ${karaokeColor}99`
              : "-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,3px 3px 5px rgba(0,0,0,0.5)";
            if (isActive) { fontWeight = "900"; letterSpacing = "0.03em"; }

          } else if (animPreset === "explosive") {
            // future: karaoke rengi soluk | active: beyaz + ateş glow | past: karaoke rengi
            wordColor   = isActive ? "#FFFFFF" : karaokeColor;
            wordOpacity = isActive ? 1.0 : isPast ? 0.9 : 0.5;
            wordShadow  = isActive
              ? `0 0 4px #FFAA00,0 0 8px #FF8800,0 0 12px #FF0000,0 0 20px #FF000088,1px 1px 1px #000`
              : `0 0 3px #FF880066,0 0 6px #FF880044,1px 1px 1px #000`;
            if (isActive) { fontWeight = "900"; letterSpacing = "0.03em"; }

          } else if (animPreset === "vibrant") {
            // future: text rengi soluk | active: karaoke rengi + yumuşak glow | past: text rengi
            wordColor   = isActive ? karaokeColor : style.text_color;
            wordOpacity = isActive ? 1.0 : isPast ? 0.85 : 0.4;
            wordShadow  = isActive
              ? `0 0 18px ${karaokeColor}88,0 2px 8px rgba(0,0,0,0.9)`
              : "0 2px 8px rgba(0,0,0,0.9)";
            if (isActive) { fontWeight = "900"; }

          } else {
            // minimal: sadece renk değişimi
            wordColor   = isActive ? karaokeColor : style.text_color;
            wordOpacity = isActive ? 1.0 : isPast ? 0.8 : 0.5;
          }

          return (
            <span
              key={`${w.scene}-${idx}`}
              style={{
                color: wordColor,
                opacity: wordOpacity,
                transform: `scale(${wordScale})`,
                display: "inline-block",
                marginRight: "0.22em",
                textShadow: wordShadow,
                fontWeight,
                letterSpacing,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </span>
    </div>
  );
}
