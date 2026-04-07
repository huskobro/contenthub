/**
 * Karaoke altyazı Remotion composition component'ı — M4-C2.
 *
 * Gerçek kelime-düzeyi highlight ile altyazı render eder.
 * word_timing.json artifact'ından gelen WordTiming verisini tüketir.
 *
 * KURULUM NOTU:
 *   Remotion M6-C1 kapsamında kuruldu ve bu component aktif edildi.
 *   Render pipeline'ı `composition_props.json`'u üretir (render_status: "props_ready");
 *   RenderStepExecutor bu dosyayı içeren renderer paketini subprocess ile çağırır.
 *
 * Timing modu davranışı:
 *   whisper_word    → kelime bazında highlight (word.start ≤ currentTime < word.end)
 *   whisper_segment → satır bazında highlight (segment zamanlaması kullanılır)
 *   cursor          → SRT tabanlı fallback: aktif subtitle satırını düz metin gösterir
 *                     Operatöre ve kullanıcıya "degrade zamanlama modu" olarak yansıtılır.
 *
 * Stil kontrolü:
 *   Stil alanları SubtitleStylePreset sözleşmesinden gelir.
 *   Component içinde magic string veya hardcoded renk yoktur.
 *   Tüm görsel kararlar preset katmanında alınır.
 *
 * M41c: Portrait layout desteği eklendi.
 *   isPortrait=true olduğunda font boyutu ve konum portrait için optimize edilir.
 * M41c: Cursor modunda SRT parse fallback eklendi.
 *   subtitles_srt geçilirse cursor modda dahi altyazı görünür.
 */

// Remotion M6-C1 ile kuruldu — import'lar aktif edildi.
import { useCurrentFrame, useVideoConfig } from "remotion";

import type {
  WordTiming,
  SubtitleStylePreset,
  TimingMode,
  KaraokeRenderBehavior,
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
  // SRT blokları boş satırlarla ayrılır
  const blocks = srt.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    // lines[0] = index, lines[1] = timestamps, lines[2+] = text
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
// Yardımcı: aktif kelimeyi bul
// ---------------------------------------------------------------------------

/**
 * currentTime'a göre aktif WordTiming öğesini döner.
 * whisper_word modu için kullanılır.
 */
function findActiveWord(
  words: WordTiming[],
  currentTime: number
): WordTiming | null {
  for (const w of words) {
    if (currentTime >= w.start && currentTime < w.end) {
      return w;
    }
  }
  return null;
}

/**
 * currentTime'a göre aktif metni döner (whisper_segment modu için).
 */
function findActiveSegmentText(
  words: WordTiming[],
  currentTime: number
): string | null {
  const sceneWords = words.filter((w) => {
    const sw = words.filter((sw) => sw.scene === w.scene);
    if (sw.length === 0) return false;
    const sceneStart = sw[0].start;
    const sceneEnd = sw[sw.length - 1].end;
    return currentTime >= sceneStart && currentTime < sceneEnd;
  });

  if (sceneWords.length === 0) return null;
  return sceneWords.map((w) => w.word).join(" ");
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
  } = props;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const behavior: KaraokeRenderBehavior = resolveKaraokeRenderBehavior(timingMode);

  // M41c: Portrait layout — font boyutu ve konum ayarları
  const portraitFontSize = Math.round(style.font_size * 0.75);
  const fontSize = isPortrait ? portraitFontSize : style.font_size;
  const bottomPct = isPortrait ? "12%" : "10%";
  const sidePct = isPortrait ? "4%" : "5%";

  let displayText: string | null = null;
  let activeWordText: string | null = null;

  if (behavior.word_level_highlight) {
    const activeWord = findActiveWord(wordTimings, currentTime);
    if (activeWord) {
      displayText = wordTimings
        .filter((w) => w.scene === activeWord.scene)
        .map((w) => w.word)
        .join(" ");
      activeWordText = activeWord.word;
    }
  } else if (behavior.segment_level_highlight) {
    displayText = findActiveSegmentText(wordTimings, currentTime);
  } else if (behavior.degraded_mode) {
    // M41c: cursor mod — SRT fallback. Whisper yoksa bile altyazı göster.
    if (subtitlesSrt) {
      const entries = parseSrt(subtitlesSrt);
      displayText = findActiveSrtEntry(entries, currentTime);
    }
    // SRT da yoksa boş kalır — sessiz render
  }

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: bottomPct,
    left: sidePct,
    right: sidePct,
    textAlign: "center",
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontWeight: style.font_weight,
    color: style.text_color,
    background: style.background !== "none" ? style.background : undefined,
    lineHeight: style.line_height,
    padding: isPortrait ? "3px 8px" : "4px 12px",
    borderRadius: "4px",
    textShadow:
      style.outline_width > 0
        ? `${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color},
           -${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color},
           ${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color},
           -${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color}`
        : undefined,
  };

  if (!displayText) {
    return <div style={containerStyle} />;
  }

  // Kelime-düzeyi highlight
  if (behavior.word_level_highlight && activeWordText) {
    const words = displayText.split(" ");
    return (
      <div style={containerStyle}>
        <span style={textStyle}>
          {words.map((word, index) => {
            const isActive = word === activeWordText;
            return (
              <span
                key={index}
                style={{
                  color: isActive ? style.active_color : style.text_color,
                  transition: "color 0.05s ease",
                }}
              >
                {word}
                {index < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  // Segment highlight — tüm satır active_color ile
  if (behavior.segment_level_highlight) {
    return (
      <div style={containerStyle}>
        <span style={{ ...textStyle, color: style.active_color }}>
          {displayText}
        </span>
      </div>
    );
  }

  // Cursor/degrade mod — düz metin (SRT fallback)
  return (
    <div style={containerStyle}>
      <span style={textStyle}>{displayText}</span>
    </div>
  );
}
