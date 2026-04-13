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
 *
 * Creative Output Pack:
 *   A1: Gerçek sahne geçişi — Sequence overlap ile crossfade/dissolve
 *   A2: Intro sequence — başlık kartı + gradient + spring/fade
 *   A3: Outro / end card — kanal adı + fade-out
 *   A4: Ken Burns çeşitliliği — sahne bazlı yön (zoom-in/out, pan-left/right)
 *   A5: sceneTransitionDuration prop'tan okunur (hardcoded değil)
 *   B2: subtitleFontFamily KaraokeSubtitle'a geçirilir
 *   B5: Landscape modda da başlık overlay
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
  /** B4: Ken Burns hareket şiddeti — 0.0 (yok) ile 1.0 (agresif) arası. */
  kenBurnsIntensity?: number;
  /** B4: Intro süre (saniye) — motion_level'e bağlı. Varsayılan: 2.5. */
  introDuration?: number;
  /** B4: Outro süre (saniye) — motion_level'e bağlı. Varsayılan: 2.5. */
  outroDuration?: number;
  /** B6: Sahne visual_cue metnini overlay olarak göster. */
  showVisualCue?: boolean;
}

// ---------------------------------------------------------------------------
// Ken Burns yön sistemi (A4) — sahne numarasına göre deterministik
// ---------------------------------------------------------------------------

type KenBurnsDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

const KB_DIRECTIONS: KenBurnsDirection[] = ["zoom-in", "zoom-out", "pan-left", "pan-right"];

function getKenBurnsDirection(sceneNumber: number): KenBurnsDirection {
  return KB_DIRECTIONS[sceneNumber % KB_DIRECTIONS.length];
}

/**
 * Ken Burns transform hesabı — yöne göre scale ve translate üretir.
 * Her sahne farklı kamera hareketi alır.
 * B4: intensity (0.0–1.0) hareketin büyüklüğünü kontrol eder.
 */
function computeKenBurnsTransform(
  frame: number,
  durationInFrames: number,
  direction: KenBurnsDirection,
  intensity: number = 0.5
): { scale: number; translateX: number; translateY: number } {
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  // intensity: 0 = sabit, 0.5 = normal, 1.0 = agresif
  const zoomRange = 0.04 + intensity * 0.16; // 0.04–0.20 arası zoom
  const panRange = 1 + intensity * 4;         // 1–5px arası pan
  switch (direction) {
    case "zoom-in":
      return { scale: interpolate(progress, [0, 1], [1.0, 1.0 + zoomRange]), translateX: 0, translateY: 0 };
    case "zoom-out":
      return { scale: interpolate(progress, [0, 1], [1.0 + zoomRange, 1.0]), translateX: 0, translateY: 0 };
    case "pan-left":
      return { scale: 1.0 + zoomRange * 0.5, translateX: interpolate(progress, [0, 1], [panRange, -panRange]), translateY: 0 };
    case "pan-right":
      return { scale: 1.0 + zoomRange * 0.5, translateX: interpolate(progress, [0, 1], [-panRange, panRange]), translateY: 0 };
    default:
      return { scale: 1.0, translateX: 0, translateY: 0 };
  }
}

// ---------------------------------------------------------------------------
// Intro Card component (A2) — başlık kartı, gradient arka plan, spring giriş
// ---------------------------------------------------------------------------

interface IntroCardProps {
  title: string;
  bgColor: string;
  titleColor: string;
  titleFontSize: number;
  isPortrait: boolean;
  gradientIntensity: number;
}

function IntroCard({ title, bgColor, titleColor, titleFontSize, isPortrait, gradientIntensity }: IntroCardProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Spring entrance for title
  const titleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const titleScale = interpolate(titleProgress, [0, 1], [0.7, 1.0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Fade out in the last 15 frames
  const fadeOutFrames = Math.min(15, Math.floor(durationInFrames * 0.3));
  const fadeOutStart = durationInFrames - fadeOutFrames;
  const fadeOut = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle gradient background
  const gi = Math.max(0, Math.min(1, gradientIntensity));
  const gradientBg = `radial-gradient(ellipse at center, ${bgColor} 0%, rgba(0,0,0,${(gi * 1.2).toFixed(2)}) 100%)`;

  // Accent line spring
  const lineWidth = interpolate(titleProgress, [0, 1], [0, isPortrait ? 50 : 30], { extrapolateRight: "clamp" });

  const introFontSize = isPortrait ? Math.round(titleFontSize * 1.4) : Math.round(titleFontSize * 1.6);

  return (
    <AbsoluteFill style={{ background: gradientBg, opacity: fadeOut }}>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isPortrait ? "8% 6%" : "5% 10%",
      }}>
        {/* Title text */}
        <div style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          fontSize: introFontSize,
          fontWeight: "800",
          color: titleColor,
          textAlign: "center",
          lineHeight: 1.3,
          letterSpacing: "0.02em",
          textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.4)",
          maxWidth: isPortrait ? "90%" : "80%",
        }}>
          {title}
        </div>

        {/* Accent line */}
        <div style={{
          marginTop: 24,
          width: `${lineWidth}%`,
          height: 3,
          background: `linear-gradient(to right, transparent, ${titleColor}99, transparent)`,
          opacity: titleOpacity,
        }} />
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Outro Card component (A3) — bitiş kartı, kanal/CTA + fade-out
// ---------------------------------------------------------------------------

interface OutroCardProps {
  channelName: string;
  bgColor: string;
  titleColor: string;
  isPortrait: boolean;
  gradientIntensity: number;
}

function OutroCard({ channelName, bgColor, titleColor, isPortrait, gradientIntensity }: OutroCardProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in over first 20 frames
  const fadeInFrames = Math.min(20, Math.floor(durationInFrames * 0.35));
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Spring entrance
  const entryProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const entryY = interpolate(entryProgress, [0, 1], [30, 0]);

  const gi = Math.max(0, Math.min(1, gradientIntensity));
  const gradientBg = `radial-gradient(ellipse at center, ${bgColor} 0%, rgba(0,0,0,${(gi * 1.2).toFixed(2)}) 100%)`;

  const outroFontSize = isPortrait ? 28 : 32;

  return (
    <AbsoluteFill style={{ background: gradientBg, opacity: fadeIn }}>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isPortrait ? "8% 6%" : "5% 10%",
      }}>
        {/* Channel / watermark branding */}
        {channelName && (
          <div style={{
            opacity: fadeIn,
            transform: `translateY(${entryY}px)`,
            fontSize: outroFontSize,
            fontWeight: "700",
            color: titleColor,
            textAlign: "center",
            letterSpacing: "0.06em",
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}>
            {channelName}
          </div>
        )}

        {/* Accent line */}
        <div style={{
          marginTop: 16,
          width: isPortrait ? "40%" : "20%",
          height: 2,
          background: `linear-gradient(to right, transparent, ${titleColor}66, transparent)`,
          opacity: fadeIn,
        }} />
      </div>
    </AbsoluteFill>
  );
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
// Landscape overlay — gradient + optional title (B5)
// ---------------------------------------------------------------------------

interface LandscapeOverlayProps {
  gradientIntensity?: number;
  title?: string;
  titleFontSize?: number;
  titleColor?: string;
}

function LandscapeOverlay({ gradientIntensity = 0.65, title, titleFontSize = 26, titleColor = "#FFFFFF" }: LandscapeOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gi = Math.max(0, Math.min(1, gradientIntensity));

  // Title spring entrance (B5)
  const headProgress = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const headOpacity = interpolate(headProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(headProgress, [0, 1], [-12, 0]);

  return (
    <>
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "35%",
        background: `linear-gradient(to top, rgba(0,0,0,${gi.toFixed(2)}) 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* B5: Landscape title overlay — top-left branding */}
      {title && (
        <div style={{
          position: "absolute",
          top: "4%",
          left: "3%",
          right: "40%",
          opacity: headOpacity,
          transform: `translateY(${headY}px)`,
          fontSize: titleFontSize,
          fontWeight: "700",
          color: titleColor,
          textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)",
          lineHeight: 1.3,
          letterSpacing: "0.03em",
          pointerEvents: "none",
        }}>
          {title}
        </div>
      )}
    </>
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
// B6: Visual Cue Tag — sahne başında kısa süreli bilgi overlay
// ---------------------------------------------------------------------------

interface VisualCueTagProps {
  text: string;
  isPortrait: boolean;
  titleColor: string;
  subtitleFontSize: number;
}

function VisualCueTag({ text, isPortrait, titleColor, subtitleFontSize }: VisualCueTagProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text) return null;

  // İlk 60 karakter
  const displayText = text.length > 60 ? text.slice(0, 57) + "..." : text;

  // Fade-in 10 frame, visible ~2s, fade-out 15 frame
  const visibleFrames = Math.round(2.0 * fps);
  const fadeInEnd = 10;
  const fadeOutStart = visibleFrames - 15;

  const opacity = frame > visibleFrames
    ? 0
    : frame < fadeInEnd
      ? interpolate(frame, [0, fadeInEnd], [0, 0.45], { extrapolateRight: "clamp" })
      : frame > fadeOutStart
        ? interpolate(frame, [fadeOutStart, visibleFrames], [0.45, 0], { extrapolateRight: "clamp" })
        : 0.45;

  if (opacity <= 0) return null;

  const fontSize = Math.round(subtitleFontSize * 0.45);

  const posStyle: React.CSSProperties = isPortrait
    ? { position: "absolute", top: "14%", left: "6%", right: "6%", textAlign: "center" }
    : { position: "absolute", bottom: "18%", left: "3%", right: "50%" };

  return (
    <div style={{
      ...posStyle,
      opacity,
      fontSize,
      fontWeight: "500",
      fontStyle: "italic",
      color: titleColor,
      textShadow: "0 1px 6px rgba(0,0,0,0.9)",
      letterSpacing: "0.02em",
      pointerEvents: "none",
    }}>
      {displayText}
    </div>
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
    animPreset: KaraokeAnimPreset;
    fontFamily?: string;
  };
  isPortrait: boolean;
  showTitle?: string;
  /** A4: Ken Burns yönü — deterministik sahne bazlı */
  kenBurnsDirection: KenBurnsDirection;
  /** A1: Geçiş süresi (frame) — overlap bölgesinde crossfade */
  transitionDurationFrames: number;
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
  /** B4: Ken Burns hareket şiddeti */
  kenBurnsIntensity?: number;
  /** B6: Visual cue overlay göster */
  showVisualCue?: boolean;
}

function SceneComponent({
  scene, subtitleProps, isPortrait, showTitle,
  kenBurnsDirection,
  transitionDurationFrames,
  imageKenBurns = true, imageTransition = "crossfade",
  bgColor = "#0a0a0a", gradientIntensity = 0.65,
  titleFontSize = 30, titleColor = "#FFFFFF",
  watermarkText = "", watermarkOpacity = 0.3, watermarkPosition = "bottom-right",
  kenBurnsIntensity = 0.5,
  showVisualCue = true,
}: SceneComponentProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // A4+B4: Ken Burns with direction variety + intensity
  const { scale: kbScale, translateX: kbTx, translateY: kbTy } = imageKenBurns
    ? computeKenBurnsTransform(frame, durationInFrames, kenBurnsDirection, kenBurnsIntensity)
    : { scale: 1.0, translateX: 0, translateY: 0 };

  // A1+A5: Transition — sahne girişinde fade-in efekti (props'tan süre)
  const trFrames = Math.max(1, transitionDurationFrames);
  let entryOpacity = 1;
  if (imageTransition === "crossfade") {
    entryOpacity = interpolate(frame, [0, trFrames], [0, 1], { extrapolateRight: "clamp" });
  } else if (imageTransition === "slide") {
    entryOpacity = interpolate(frame, [0, Math.round(trFrames * 0.6)], [0, 1], { extrapolateRight: "clamp" });
  } else if (imageTransition === "zoom") {
    entryOpacity = interpolate(frame, [0, trFrames], [0, 1], { extrapolateRight: "clamp" });
  }

  const slideX = imageTransition === "slide"
    ? interpolate(frame, [0, trFrames], [40, 0], { extrapolateRight: "clamp" })
    : 0;

  const zoomEntry = imageTransition === "zoom"
    ? interpolate(frame, [0, trFrames], [1.15, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  const totalScale = kbScale * zoomEntry;

  // A1: Exit fade-out for overlap — son N frame'de opacity düşer
  const exitFadeStart = durationInFrames - trFrames;
  const exitOpacity = durationInFrames > trFrames * 2
    ? interpolate(frame, [exitFadeStart, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, opacity: exitOpacity }}>
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
            transform: `scale(${totalScale}) translateX(${slideX + kbTx}px) translateY(${kbTy}px)`,
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
        : <LandscapeOverlay gradientIntensity={gradientIntensity} title={showTitle} titleFontSize={titleFontSize} titleColor={titleColor} />
      }

      {/* Watermark */}
      <WatermarkOverlay text={watermarkText} opacity={watermarkOpacity} position={watermarkPosition} />

      {/* B6: Visual Cue Tag — sahne başında kısa bilgi overlay */}
      {showVisualCue && scene.visual_cue && (
        <VisualCueTag
          text={scene.visual_cue}
          isPortrait={isPortrait}
          titleColor={titleColor}
          subtitleFontSize={subtitleProps.style.font_size}
        />
      )}

      {/* Altyazı katmanı — whisper varsa karaoke animasyonlu, yoksa SRT cursor fallback */}
      <KaraokeSubtitle
        wordTimings={subtitleProps.wordTimings}
        style={subtitleProps.style}
        timingMode={subtitleProps.timingMode}
        totalDurationSeconds={subtitleProps.totalDurationSeconds}
        subtitlesSrt={subtitleProps.subtitlesSrt}
        isPortrait={subtitleProps.isPortrait}
        animPreset={subtitleProps.animPreset}
        fontFamily={subtitleProps.fontFamily}
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
    sceneTransitionDuration,
    bgColor = "#0a0a0a",
    showTitleOverlay = true,
    titleFontSize = 30,
    titleColor = "#FFFFFF",
    gradientIntensity = 0.65,
    watermarkText = "",
    watermarkOpacity = 0.3,
    watermarkPosition = "bottom-right",
    subtitleFontFamily,
    // B4+B6 props
    kenBurnsIntensity = 0.5,
    introDuration = 2.5,
    outroDuration = 2.5,
    showVisualCue = true,
  } = props;

  // M41c: Portrait detection — renderFormat prop veya canvas boyutundan
  const isPortrait = renderFormat === "portrait" || height > width;

  // A5: Geçiş süresi — prop'tan veya varsayılan 0.5s
  const transitionSec = sceneTransitionDuration ?? 0.5;
  const transitionFrames = Math.max(1, Math.round(transitionSec * fps));

  // A2+B4: Intro süre — motion_level'e bağlı
  const introFrames = Math.round(introDuration * fps);
  const hasIntro = !!title && scenes.length > 0;

  // A3+B4: Outro süre — motion_level'e bağlı
  const outroFrames = Math.round(outroDuration * fps);
  // Outro text: watermarkText (kanal adı) veya title
  const outroText = watermarkText || title || "";
  const hasOutro = !!outroText && scenes.length > 0;

  // A1: Sahne frame offsetlerini hesapla — overlap ile
  // Intro → scene0 → scene1 → ... → sceneN → outro
  // Her sahne arası transitionFrames kadar overlap var
  const sceneFrameLengths: number[] = scenes.map(s => Math.round(s.duration_seconds * fps));

  // Intro offset: intro başlangıcı = 0
  const introStart = 0;
  // İlk sahne, intro bitmeden transitionFrames önce başlar (overlap)
  let currentOffset = hasIntro ? introFrames - transitionFrames : 0;

  const sceneOffsets: number[] = [];
  for (let i = 0; i < scenes.length; i++) {
    sceneOffsets.push(Math.max(0, currentOffset));
    currentOffset += sceneFrameLengths[i] - (i < scenes.length - 1 ? transitionFrames : 0);
  }

  // Outro offset: son sahne bitmeden transitionFrames önce
  const outroStart = hasOutro && scenes.length > 0
    ? sceneOffsets[scenes.length - 1] + sceneFrameLengths[scenes.length - 1] - transitionFrames
    : currentOffset;

  const subtitleProps = {
    wordTimings,
    style: subtitle_style,
    timingMode: timing_mode,
    totalDurationSeconds: total_duration_seconds,
    subtitlesSrt: subtitles_srt,
    isPortrait,
    animPreset: (karaokeAnimPreset ?? "hype") as KaraokeAnimPreset,
    fontFamily: subtitleFontFamily,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* A2: Intro card */}
      {hasIntro && (
        <Sequence
          from={introStart}
          durationInFrames={introFrames}
        >
          <IntroCard
            title={title}
            bgColor={bgColor}
            titleColor={titleColor}
            titleFontSize={titleFontSize}
            isPortrait={isPortrait}
            gradientIntensity={gradientIntensity}
          />
        </Sequence>
      )}

      {/* Sahneler — A1: overlap ile gerçek geçiş */}
      {scenes.map((scene, index) => {
        const durationFrames = sceneFrameLengths[index];
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
              kenBurnsDirection={getKenBurnsDirection(scene.scene_number)}
              transitionDurationFrames={transitionFrames}
              imageKenBurns={imageKenBurns}
              imageTransition={imageTransition}
              bgColor={bgColor}
              gradientIntensity={gradientIntensity}
              titleFontSize={titleFontSize}
              titleColor={titleColor}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkPosition={watermarkPosition}
              kenBurnsIntensity={kenBurnsIntensity}
              showVisualCue={showVisualCue}
            />
          </Sequence>
        );
      })}

      {/* A3: Outro card */}
      {hasOutro && (
        <Sequence
          from={outroStart}
          durationInFrames={outroFrames}
        >
          <OutroCard
            channelName={outroText}
            bgColor={bgColor}
            titleColor={titleColor}
            isPortrait={isPortrait}
            gradientIntensity={gradientIntensity}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
