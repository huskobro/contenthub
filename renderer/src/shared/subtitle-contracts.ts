/**
 * Altyazı rendering sözleşmeleri — M4-C2.
 *
 * Bu dosya backend subtitle_presets.py ile uyumlu tutulmalıdır.
 * Her iki taraf aynı alanları destekler; değişiklikler birlikte güncellenir.
 *
 * Timing modu semantiği:
 *   whisper_word    : Gerçek kelime-düzeyi zamanlama. Karaoke highlight tam doğrulukla çalışır.
 *   whisper_segment : Segment zamanlama. Highlight satır bazında çalışır, kelime bazında değil.
 *   cursor          : Tahmini cursor zamanlama. Highlight degrade modda çalışır —
 *                     kelime başlangıç/bitiş zamanı yoktur; satır highlight kullanılır.
 *                     Kullanıcıya/operatöre açıkça "degrade zamanlama modu" olarak yansıtılmalıdır.
 *
 * NOT: cursor modu whisper_word ile eşdeğer değildir.
 *      Bu ayrım UI katmanında ve Job Detail provider trace'inde görünür kalmalıdır.
 */

/** Tek bir kelime için zamanlama verisi. */
export interface WordTiming {
  /** Sahnedeki kelime sırası (1-indexed, sahne bazında). */
  scene: number;
  /** Kelime metni (baştaki/sondaki boşluk olmadan). */
  word: string;
  /** Başlangıç zamanı (saniye, tüm video timeline'ında). */
  start: number;
  /** Bitiş zamanı (saniye, tüm video timeline'ında). */
  end: number;
  /** Whisper tahmin güveni (0.0–1.0). */
  probability: number;
}

/** word_timing.json dosyasının tam yapısı. */
export interface WordTimingArtifact {
  version: "1";
  timing_mode: TimingMode;
  language: string;
  words: WordTiming[];
  word_count: number;
}

/** Altyazı zamanlama modu. */
export type TimingMode = "whisper_word" | "whisper_segment" | "cursor";

/** Altyazı stil preset. Backend SubtitlePreset ile 1:1 uyumlu. */
export interface SubtitleStylePreset {
  preset_id: SubtitlePresetId;
  label: string;
  font_size: number;        // px
  font_weight: string;      // "400" | "600" | "700" vb.
  text_color: string;       // hex veya rgba
  active_color: string;     // aktif kelime rengi (karaoke highlight)
  background: string;       // "none" | hex | rgba
  outline_width: number;    // px
  outline_color: string;    // hex
  line_height: number;      // em
}

/** Geçerli preset kimlik listesi. Backend VALID_PRESET_IDS ile uyumlu. */
export type SubtitlePresetId =
  | "clean_white"
  | "bold_yellow"
  | "minimal_dark"
  | "gradient_glow"
  | "outline_only";

/** composition_props.json içindeki subtitle alanları. */
export interface CompositionSubtitleProps {
  subtitles_srt: string | null;
  word_timing_path: string | null;
  timing_mode: TimingMode;
  subtitle_style: SubtitleStylePreset;
}

/**
 * Karaoke highlight render davranışı — timing moduna göre değişir.
 *
 * whisper_word    : currentTime >= word.start && currentTime < word.end → kelime highlight
 * whisper_segment : currentTime >= segment.start && currentTime < segment.end → satır highlight
 * cursor          : hiçbir word timing yok → düz metin, renk değişimi yok
 *                   (degrade mod — kullanıcıya açıkça belirtilmeli)
 */
export interface KaraokeRenderBehavior {
  timing_mode: TimingMode;
  /** whisper_word modunda true — bireysel kelimeler vurgulanır. */
  word_level_highlight: boolean;
  /** whisper_segment modunda true — satır bazında vurgulama yapılır. */
  segment_level_highlight: boolean;
  /** cursor modunda true — zamanlama verisi yok, düz render. */
  degraded_mode: boolean;
}

/** timing_mode'a göre KaraokeRenderBehavior hesaplar. */
export function resolveKaraokeRenderBehavior(mode: TimingMode): KaraokeRenderBehavior {
  return {
    timing_mode: mode,
    word_level_highlight: mode === "whisper_word",
    segment_level_highlight: mode === "whisper_segment",
    degraded_mode: mode === "cursor",
  };
}
