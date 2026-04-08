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
  KaraokeAnimPreset,
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
  /** M42: Karaoke animasyon preset. Varsayılan: "hype". */
  karaokeAnimPreset?: KaraokeAnimPreset;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  };
  /** M44: Visual & overlay parameters — tümü admin panelden kontrol edilir */
  renderFps?: number;
  imageKenBurns?: boolean;
  imageTransition?: "crossfade" | "cut" | "slide" | "zoom";
  sceneTransitionDuration?: number;
  bgColor?: string;
  showTitleOverlay?: boolean;
  titleFontSize?: number;
  titleColor?: string;
  gradientIntensity?: number;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  subtitleFontFamily?: string;
}

// ---------------------------------------------------------------------------
// Portrait overlay — gradient + safe area overlay for 9:16
// ---------------------------------------------------------------------------

interface PortraitOverlayProps {
  title?: string;
  gradientIntensity?: number;
  titleFontSize?: number;
  titleColor?: string;
}

function PortraitOverlay({ title, gradientIntensity = 0.65, titleFontSize = 30, titleColor = "#FFFFFF" }: PortraitOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gi = Math.max(0, Math.min(1, gradientIntensity));

  // Başlık spring entrance
  const headProgress = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const headY = interpolate(headProgress, [0, 1], [-20, 0]);
  const headOpacity = interpolate(headProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      {/* Vignette — üst ve yan kenar karartma */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: [
          `linear-gradient(to bottom, rgba(0,0,0,${(gi * 0.92).toFixed(2)}) 0%, transparent 20%)`,
          `linear-gradient(to bottom, transparent 55%, rgba(0,0,0,${(gi * 1.15).toFixed(2)}) 75%, rgba(0,0,0,${Math.min(gi * 1.42, 0.98).toFixed(2)}) 100%)`,
        ].join(", "),
        pointerEvents: "none",
      }} />

      {/* Aksan çizgisi — metin alanı başlangıcında */}
      <div style={{
        position: "absolute",
        bottom: "42%",
        left: "6%",
        right: "6%",
        height: 3,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)",
        pointerEvents: "none",
      }} />

      {/* Başlık — portrait üst branding, spring entrance */}
      {title && (
        <div style={{
          position: "absolute",
          top: "4%",
          left: "5%",
          right: "5%",
          opacity: headOpacity,
          transform: `translateY(${headY}px)`,
          textAlign: "center",
          fontSize: titleFontSize,
          fontWeight: "700",
          color: titleColor,
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6)",
          lineHeight: 1.3,
          letterSpacing: "0.04em",
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

interface LandscapeOverlayProps {
  gradientIntensity?: number;
}

function LandscapeOverlay({ gradientIntensity = 0.65 }: LandscapeOverlayProps) {
  const gi = Math.max(0, Math.min(1, gradientIntensity));
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "35%",
      background: `linear-gradient(to top, rgba(0,0,0,${gi.toFixed(2)}) 0%, transparent 100%)`,
      pointerEvents: "none",
    }} />
  );
}

// ---------------------------------------------------------------------------
// Watermark overlay — M44: admin ayarlı kanal/marka watermark
// ---------------------------------------------------------------------------

interface WatermarkOverlayProps {
  text: string;
  opacity?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

function WatermarkOverlay({ text, opacity = 0.3, position = "bottom-right" }: WatermarkOverlayProps) {
  if (!text) return null;

  const posStyle: React.CSSProperties = {
    position: "absolute",
    ...(position.includes("top") ? { top: "3%" } : { bottom: "3%" }),
    ...(position.includes("left") ? { left: "3%" } : { right: "3%" }),
    opacity,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
    letterSpacing: "0.06em",
    pointerEvents: "none" as const,
  };

  return <div style={posStyle}>{text}</div>;
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
    animPreset: KaraokeAnimPreset;
  };
  isPortrait: boolean;
  showTitle?: string;
  /** M44 props */
  imageKenBurns?: boolean;
  imageTransition?: "crossfade" | "cut" | "slide" | "zoom";
  bgColor?: string;
  gradientIntensity?: number;
  titleFontSize?: number;
  titleColor?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

function SceneComponent({
  scene, subtitleProps, isPortrait, showTitle,
  imageKenBurns = true, imageTransition = "crossfade",
  bgColor = "#0a0a0a", gradientIntensity = 0.65,
  titleFontSize = 30, titleColor = "#FFFFFF",
  watermarkText = "", watermarkOpacity = 0.3, watermarkPosition = "bottom-right",
}: SceneComponentProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken Burns: yavaş zoom (1.0 → 1.08 arası lerp)
  const kenBurnsScale = imageKenBurns
    ? interpolate(frame, [0, durationInFrames], [1.0, 1.08], { extrapolateRight: "clamp" })
    : 1.0;

  // Transition: sahne girişinde fade-in efekti
  const transitionFrames = Math.round(fps * 0.5);
  let entryOpacity = 1;
  if (imageTransition === "crossfade") {
    entryOpacity = interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: "clamp" });
  } else if (imageTransition === "slide") {
    entryOpacity = interpolate(frame, [0, Math.round(transitionFrames * 0.6)], [0, 1], { extrapolateRight: "clamp" });
  } else if (imageTransition === "zoom") {
    entryOpacity = interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: "clamp" });
  }

  const slideX = imageTransition === "slide"
    ? interpolate(frame, [0, transitionFrames], [40, 0], { extrapolateRight: "clamp" })
    : 0;

  const zoomEntry = imageTransition === "zoom"
    ? interpolate(frame, [0, transitionFrames], [1.15, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  const totalScale = kenBurnsScale * zoomEntry;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Arka plan görseli */}
      {scene.image_path && (
        <Img
          src={scene.image_path}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: isPortrait ? "center 20%" : "center center",
            opacity: entryOpacity,
            transform: `scale(${totalScale}) translateX(${slideX}px)`,
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
      {isPortrait
        ? <PortraitOverlay title={showTitle} gradientIntensity={gradientIntensity} titleFontSize={titleFontSize} titleColor={titleColor} />
        : <LandscapeOverlay gradientIntensity={gradientIntensity} />
      }

      {/* Watermark */}
      <WatermarkOverlay text={watermarkText} opacity={watermarkOpacity} position={watermarkPosition} />

      {/* Altyazı katmanı — whisper varsa karaoke animasyonlu, yoksa SRT cursor fallback */}
      <KaraokeSubtitle
        wordTimings={subtitleProps.wordTimings}
        style={subtitleProps.style}
        timingMode={subtitleProps.timingMode}
        totalDurationSeconds={subtitleProps.totalDurationSeconds}
        subtitlesSrt={subtitleProps.subtitlesSrt}
        isPortrait={subtitleProps.isPortrait}
        animPreset={subtitleProps.animPreset}
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
    karaokeAnimPreset,
    title,
    // M44 props
    imageKenBurns = true,
    imageTransition = "crossfade",
    bgColor = "#0a0a0a",
    showTitleOverlay = true,
    titleFontSize = 30,
    titleColor = "#FFFFFF",
    gradientIntensity = 0.65,
    watermarkText = "",
    watermarkOpacity = 0.3,
    watermarkPosition = "bottom-right",
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
    animPreset: (karaokeAnimPreset ?? "hype") as KaraokeAnimPreset,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
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
              showTitle={showTitleOverlay && index === 0 ? title : undefined}
              imageKenBurns={imageKenBurns}
              imageTransition={imageTransition}
              bgColor={bgColor}
              gradientIntensity={gradientIntensity}
              titleFontSize={titleFontSize}
              titleColor={titleColor}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkPosition={watermarkPosition}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
