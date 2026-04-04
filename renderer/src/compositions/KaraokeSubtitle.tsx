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
 *   cursor          → degrade mod: düz metin, renk değişimi yok
 *                     Operatöre ve kullanıcıya "degrade zamanlama modu" olarak yansıtılır.
 *
 * Stil kontrolü:
 *   Stil alanları SubtitleStylePreset sözleşmesinden gelir.
 *   Component içinde magic string veya hardcoded renk yoktur.
 *   Tüm görsel kararlar preset katmanında alınır.
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
}

// ---------------------------------------------------------------------------
// Yardımcı: aktif kelimeyi bul
// ---------------------------------------------------------------------------

/**
 * currentTime'a göre aktif WordTiming öğesini döner.
 * whisper_word modu için kullanılır.
 *
 * @param words   Kelime zamanlama listesi.
 * @param currentTime   Mevcut video zamanı (saniye).
 * @returns Aktif kelime veya null.
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
 * Segment başlangıç ve bitiş zamanları kelime verilerinden çıkarılır.
 *
 * @param words   Kelime zamanlama listesi.
 * @param currentTime   Mevcut video zamanı (saniye).
 * @returns Aktif segment metni veya null.
 */
function findActiveSegmentText(
  words: WordTiming[],
  currentTime: number
): string | null {
  // Aynı sahnenin kelimelerini bul
  const sceneWords = words.filter((w) => {
    // Sahne zamanlaması: sahnenin ilk kelimesi start, son kelimesi end
    const sceneWords = words.filter((sw) => sw.scene === w.scene);
    if (sceneWords.length === 0) return false;
    const sceneStart = sceneWords[0].start;
    const sceneEnd = sceneWords[sceneWords.length - 1].end;
    return currentTime >= sceneStart && currentTime < sceneEnd;
  });

  if (sceneWords.length === 0) return null;
  return sceneWords.map((w) => w.word).join(" ");
}

// ---------------------------------------------------------------------------
// Ana component (Remotion kurulana kadar render edilemez)
// ---------------------------------------------------------------------------

/**
 * Karaoke altyazı component'ı.
 *
 * Remotion `useCurrentFrame` ve `useVideoConfig` hook'larını kullanır.
 * M6'da Remotion kurulana kadar bu component aktif edilemez.
 *
 * Render davranışı timing_mode'a göre değişir:
 *   - whisper_word    : Her kelime için bireysel highlight.
 *   - whisper_segment : Satır bazında highlight.
 *   - cursor          : Degrade mod — düz metin, highlight yok.
 */
export function KaraokeSubtitle(props: KaraokeSubtitleProps): JSX.Element {
  const { wordTimings, style, timingMode, totalDurationSeconds } = props;

  // Remotion M6-C1: aktif edildi.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const behavior: KaraokeRenderBehavior = resolveKaraokeRenderBehavior(timingMode);

  // Aktif içeriği zamanlama moduna göre belirle
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
  }
  // cursor (degrade) mod: displayText null kalır — SRT tabanlı overlay kullanılır

  // Degrade mod uyarısı — M4-C1 notu: cursor modu whisper_word ile eşdeğer değildir
  if (behavior.degraded_mode) {
    // Operatör loguna düşürülmeli; UI'da da gösterilmeli (M4-C3 preview'da)
    console.warn(
      "[KaraokeSubtitle] Degrade zamanlama modu (cursor). " +
        "Kelime-düzeyi highlight yok. Whisper entegrasyonu aktif değil."
    );
  }

  // Satır içi stil — tüm değerler preset'ten gelir, hardcoded değer yok
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "10%",
    left: "5%",
    right: "5%",
    textAlign: "center",
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${style.font_size}px`,
    fontWeight: style.font_weight,
    color: style.text_color,
    background: style.background !== "none" ? style.background : undefined,
    lineHeight: style.line_height,
    padding: "4px 12px",
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
    // Aktif kelime/segment yok — boş render
    return <div style={containerStyle} />;
  }

  // Kelime-düzeyi highlight için kelime token'larını ayrı ayrı render et
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

  // Degrade mod — düz metin
  return (
    <div style={containerStyle}>
      <span style={textStyle}>{displayText}</span>
    </div>
  );
}
