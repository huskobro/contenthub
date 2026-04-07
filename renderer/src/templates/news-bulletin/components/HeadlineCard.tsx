import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BulletinStyle } from "./StudioBackground";
import { BULLETIN_ACCENT } from "../shared/palette";
import { SubtitleEntry, renderSubtitleWords } from "../shared/subtitle-renderer";

/** M41: Per-item image timeline segmenti */
export interface ImageTimelineSegment {
  url: string;
  startSeconds: number;
  durationSeconds: number;
}

/** HeadlineCard'a composition katmanından aktarılan düzleştirilmiş veri. */
export interface HeadlineCardItem {
  headline: string;
  /** Narration metni — altyazı yoksa ekranda gösterilir */
  narration?: string;
  /** HTTP URL — backend audio_path'ten dönüştürülmüş */
  audioUrl?: string | null;
  subtitles?: SubtitleEntry[];
  bulletinStyle?: BulletinStyle;
  /** M41: Haber görseli URL'si */
  imagePath?: string | null;
  /** M41: Birden fazla görsel için zaman bazlı gösterim planı */
  imageTimeline?: ImageTimelineSegment[] | null;
}

interface Props {
  item: HeadlineCardItem;
  /** Sıra indeksi — slayt yönünü (sol/sağ) belirler */
  index?: number;
  /** M41a: Portrait layout flag */
  isPortrait?: boolean;
}

/**
 * M41a: Crossfade hesaplaması — segment geçişlerinde yumuşak geçiş.
 * Segment başlangıcında fade-in, sonunda fade-out.
 */
const CROSSFADE_FRAMES = 6; // ~0.2s @ 30fps

function getSegmentOpacity(
  currentTimeSec: number,
  seg: ImageTimelineSegment,
  fps: number,
): number {
  const segEnd = seg.startSeconds + seg.durationSeconds;
  const fadeInDur = CROSSFADE_FRAMES / fps;
  const fadeOutDur = CROSSFADE_FRAMES / fps;

  // Fade-in
  if (currentTimeSec < seg.startSeconds + fadeInDur) {
    const t = (currentTimeSec - seg.startSeconds) / fadeInDur;
    return Math.max(0, Math.min(1, t));
  }
  // Fade-out
  if (currentTimeSec > segEnd - fadeOutDur) {
    const t = (segEnd - currentTimeSec) / fadeOutDur;
    return Math.max(0, Math.min(1, t));
  }
  return 1;
}

export const HeadlineCard: React.FC<Props> = ({ item, index = 0, isPortrait = false }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const style = item.bulletinStyle ?? "breaking";
  const accent = BULLETIN_ACCENT[style] ?? BULLETIN_ACCENT.breaking;

  // Sıra çift → soldan, tek → sağdan giriş
  const fromRight = index % 2 === 1;
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const slideX = interpolate(progress, [0, 1], [fromRight ? 120 : -120, 0]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const barProgress = spring({ frame, fps, config: { damping: 12, stiffness: 220 } });
  const barScale = interpolate(barProgress, [0, 1], [0, 1]);

  const subProgress = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, stiffness: 180 } });
  const subOpacity = interpolate(subProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(subProgress, [0, 1], [20, 0]);

  const fadeOutStart = durationInFrames - 18;
  const exitOpacity = frame >= fadeOutStart
    ? interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const subFadeOut = frame >= durationInFrames - 12
    ? interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // M41a: Aktif görselleri belirle (timeline varsa zaman bazlı crossfade)
  const currentTimeSec = frame / fps;
  const hasTimeline = item.imageTimeline && item.imageTimeline.length > 0;
  const hasMultipleImages = hasTimeline && item.imageTimeline!.length > 1;

  // Tek görsel veya ilk/son segment (crossfade gerekmez)
  let activeImageUrl: string | null = null;
  if (hasTimeline) {
    for (const seg of item.imageTimeline!) {
      if (currentTimeSec >= seg.startSeconds && currentTimeSec < seg.startSeconds + seg.durationSeconds) {
        activeImageUrl = seg.url;
        break;
      }
    }
    // Fallback: son segment
    if (!activeImageUrl) {
      activeImageUrl = item.imageTimeline![item.imageTimeline!.length - 1].url;
    }
  } else if (item.imagePath) {
    activeImageUrl = item.imagePath;
  }

  // Portrait layout adjustments
  const headlineFontSize = isPortrait ? 54 : 96;
  const narrationFontSize = isPortrait ? 24 : 40;
  const subtitleFontSize = isPortrait ? 22 : 32;
  const contentMaxWidth = isPortrait ? 900 : 1400;
  const contentPadH = isPortrait ? 40 : 80;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none", opacity: exitOpacity }}>
      {item.audioUrl && <Audio src={item.audioUrl} />}

      {/* M41a: Haber görseli arka planı — çoklu görsel crossfade */}
      {hasMultipleImages ? (
        // Çoklu görsel: tüm segmentleri render et, crossfade ile geçiş
        <>
          {item.imageTimeline!.map((seg, segIdx) => {
            // Segment aktif mi kontrol et (±crossfade süresi kadar genişlet)
            const segStart = seg.startSeconds;
            const segEnd = seg.startSeconds + seg.durationSeconds;
            const cfDur = CROSSFADE_FRAMES / fps;
            const isVisible = currentTimeSec >= segStart - cfDur && currentTimeSec < segEnd + cfDur;
            if (!isVisible) return null;

            const segOpacity = getSegmentOpacity(currentTimeSec, seg, fps);
            return (
              <Img
                key={`img-${segIdx}`}
                src={seg.url}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.35 * segOpacity,
                  filter: "blur(2px)",
                }}
              />
            );
          })}
          {/* Koyu gradient — metin okunabilirliği */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)",
          }} />
        </>
      ) : activeImageUrl ? (
        // Tek görsel
        <>
          <Img
            src={activeImageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
              filter: "blur(2px)",
            }}
          />
          {/* Koyu gradient — metin okunabilirliği */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)",
          }} />
        </>
      ) : null}

      <div style={{
        position: "absolute",
        left: "50%",
        transform: `translateX(calc(-50% + ${slideX}px))`,
        opacity,
        maxWidth: contentMaxWidth,
        paddingLeft: contentPadH,
        paddingRight: contentPadH,
        textAlign: "center",
      }}>
        {/* Aksant çizgisi */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: isPortrait ? 10 : 16 }}>
          <div style={{
            height: isPortrait ? 4 : 6,
            width: `${barScale * 60}%`,
            background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
            borderRadius: 3,
            boxShadow: `0 0 20px ${accent}88`,
          }} />
        </div>

        {/* Manşet */}
        <h1 style={{
          color: "#F5F5F5",
          fontSize: headlineFontSize,
          fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
          letterSpacing: "0.06em",
          lineHeight: 1.0,
          margin: 0,
          textShadow: `0 0 60px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.9), 0 0 120px ${accent}33`,
        }}>
          {item.headline}
        </h1>

        {/* Narration — altyazı yoksa */}
        {item.narration && (!item.subtitles || item.subtitles.length === 0) && (
          <p style={{
            color: "rgba(220,220,220,0.9)",
            fontSize: narrationFontSize,
            fontFamily: '"Montserrat", Arial, sans-serif',
            fontWeight: 400,
            marginTop: isPortrait ? 10 : 16,
            letterSpacing: "0.04em",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            transform: `translateY(${subY}px)`,
            opacity: subOpacity,
          }}>
            {item.narration}
          </p>
        )}

        {/* Dinamik altyazı / karaoke */}
        {item.subtitles && item.subtitles.length > 0 && (
          <div style={{
            marginTop: isPortrait ? 16 : 28,
            opacity: subFadeOut,
            fontSize: subtitleFontSize,
            fontFamily: '"Montserrat", Arial, sans-serif',
            fontWeight: 600,
            color: "#FFFFFF",
            textShadow: "0 2px 12px rgba(0,0,0,0.95)",
            lineHeight: 1.5,
          }}>
            {renderSubtitleWords(frame, item.subtitles, accent)}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
