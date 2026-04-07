/**
 * StandardVideo composition bileşeni — M6-C2.
 *
 * composition_props.json'dan gelen props ile video render eder.
 * Güvenli composition mapping: composition_map.py içindeki "StandardVideo" ID ile eşleşir.
 *
 * Props kaynağı (tek ve resmi render sözleşmesi):
 *   backend/app/modules/standard_video/executors/composition.py → composition_props.json
 *   backend RenderStepExecutor → word_timing.json okunur → wordTimings inline geçirilir
 *
 * word_timing yükleme mimarisi (M6-C2):
 *   word_timing.json backend tarafında okunur (RenderStepExecutor.execute).
 *   Renderer'a fs okuma yaptırılmaz — props olarak WordTiming[] array'i geçirilir.
 *   Bu sayede renderer saf React bileşeni kalır.
 *
 * Sahne sırası:
 *   Her sahne, audio_path + image_path + duration_seconds içerir.
 *   duration_seconds → frame sayısına çevrilir (fps ile, calculateMetadata tarafından).
 *
 * Altyazı rendering (M6-C2):
 *   timing_mode + subtitle_style + wordTimings → KaraokeSubtitle.
 *   wordTimings boşsa cursor (degrade) mod — KaraokeSubtitle SRT fallback ile çalışır.
 *
 * M4-C3 preview ayrımı KORUNUR:
 *   Bu composition final render içindir.
 *   M4-C3 CSS preview ayrı bir yüzeydir ve bu dosyayla çakışmaz.
 *   renderStill preview: PreviewFrameComposition ayrı composition ID ile kayıtlıdır.
 *
 * M41c:
 *   Portrait (9:16) layout desteği eklendi.
 *   isPortrait=true → metin safe area, overlay konum, gradient farklılaşır.
 *   Görsel object-fit ve blur katmanı portrait-safe alan için ayarlanır.
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useVideoConfig,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import type {
  SubtitleStylePreset,
  TimingMode,
  WordTiming,
} from "../shared/subtitle-contracts";
import { KaraokeSubtitle } from "./KaraokeSubtitle";

// ---------------------------------------------------------------------------
// Props tipi — composition_props.json → props alanıyla 1:1 uyumlu
// ---------------------------------------------------------------------------

export interface SceneProps {
  scene_number: number;
  narration: string;
  visual_cue: string;
  audio_path: string | null;
  image_path: string | null;
  duration_seconds: number;
}

/**
 * StandardVideoProps — render sözleşmesinin tek tipi.
 *
 * word_timing_path M6-C1'de string prop olarak tanımlanmıştı.
 * M6-C2'den itibaren backend bu dosyayı okur ve wordTimings olarak inline geçirir.
 * word_timing_path bu tipten kaldırıldı — renderer fs okuma yapmaz.
 *
 * Backend sözleşmesi (composition_props.json → props):
 *   word_timing_path  → backend okur, wordTimings prop'una dönüştürür
 *   wordTimings       → bu tip — render-time kullanılan array
 */
export interface StandardVideoProps {
  title: string;
  scenes: SceneProps[];
  subtitles_srt: string | null;
  /** Kelime zamanlama verisi — backend word_timing.json'dan okuyup inline geçirir. */
  wordTimings: WordTiming[];
  timing_mode: TimingMode;
  subtitle_style: SubtitleStylePreset;
  total_duration_seconds: number;
  language: string;
  /** M41: Render formatı — "landscape" (16:9) veya "portrait" (9:16). Varsayılan: landscape. */
  renderFormat?: "landscape" | "portrait";
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  };
}

// ---------------------------------------------------------------------------
// Portrait overlay — gradient + safe area overlay for 9:16
// ---------------------------------------------------------------------------

interface PortraitOverlayProps {
  title?: string;
}

function PortraitOverlay({ title }: PortraitOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 120 } }),
    [0, 1], [0, 1],
  );

  return (
    <>
      {/* Top gradient — safe area */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "20%",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Bottom gradient — altyazı ve branding alanı */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40%",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Başlık — portrait üst branding */}
      {title && (
        <div style={{
          position: "absolute",
          top: "4%",
          left: "5%",
          right: "5%",
          opacity: titleOpacity,
          textAlign: "center",
          fontSize: 28,
          fontWeight: "700",
          color: "#FFFFFF",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          lineHeight: 1.3,
        }}>
          {title}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Landscape overlay — minimal top gradient
// ---------------------------------------------------------------------------

function LandscapeOverlay() {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "35%",
      background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
      pointerEvents: "none",
    }} />
  );
}

// ---------------------------------------------------------------------------
// Tek sahne bileşeni
// ---------------------------------------------------------------------------

interface SceneComponentProps {
  scene: SceneProps;
  subtitleProps: {
    wordTimings: WordTiming[];
    style: SubtitleStylePreset;
    timingMode: TimingMode;
    totalDurationSeconds: number;
    subtitlesSrt: string | null;
    isPortrait: boolean;
  };
  isPortrait: boolean;
  showTitle?: string;
}

function SceneComponent({ scene, subtitleProps, isPortrait, showTitle }: SceneComponentProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Arka plan görseli */}
      {scene.image_path && (
        <Img
          src={scene.image_path}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // Portrait'te görsel üst-orta odaklı — yüz/nesne framing için
            objectPosition: isPortrait ? "center 20%" : "center center",
          }}
        />
      )}

      {/* Portrait blur katmanı kenar boşlukları için değil, dramatik efekt */}
      {isPortrait && scene.image_path && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.08)",
        }} />
      )}

      {/* Sahne sesi */}
      {scene.audio_path && (
        <Audio src={scene.audio_path} />
      )}

      {/* Gradient overlay */}
      {isPortrait ? <PortraitOverlay title={showTitle} /> : <LandscapeOverlay />}

      {/* Altyazı katmanı — whisper varsa karaoke, yoksa SRT cursor fallback */}
      <KaraokeSubtitle
        wordTimings={subtitleProps.wordTimings}
        style={subtitleProps.style}
        timingMode={subtitleProps.timingMode}
        totalDurationSeconds={subtitleProps.totalDurationSeconds}
        subtitlesSrt={subtitleProps.subtitlesSrt}
        isPortrait={subtitleProps.isPortrait}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Ana composition bileşeni
// ---------------------------------------------------------------------------

export function StandardVideoComposition(props: StandardVideoProps) {
  const { fps, width, height } = useVideoConfig();
  const {
    scenes,
    wordTimings,
    subtitle_style,
    timing_mode,
    total_duration_seconds,
    subtitles_srt,
    renderFormat,
    title,
  } = props;

  // M41c: Portrait detection — renderFormat prop veya canvas boyutundan
  const isPortrait = renderFormat === "portrait" || height > width;

  // Sahne frame offsetlerini hesapla
  const sceneOffsets: number[] = [];
  let offset = 0;
  for (const scene of scenes) {
    sceneOffsets.push(offset);
    offset += Math.round(scene.duration_seconds * fps);
  }

  const subtitleProps = {
    wordTimings,
    style: subtitle_style,
    timingMode: timing_mode,
    totalDurationSeconds: total_duration_seconds,
    subtitlesSrt: subtitles_srt,
    isPortrait,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {scenes.map((scene, index) => {
        const durationFrames = Math.round(scene.duration_seconds * fps);
        if (durationFrames <= 0) return null;

        return (
          <Sequence
            key={scene.scene_number}
            from={sceneOffsets[index]}
            durationInFrames={durationFrames}
          >
            <SceneComponent
              scene={scene}
              subtitleProps={subtitleProps}
              isPortrait={isPortrait}
              // Portrait'te ilk sahnede başlık göster
              showTitle={isPortrait && index === 0 ? title : undefined}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
