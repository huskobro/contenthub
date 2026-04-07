import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BulletinStyle } from "./StudioBackground";
import { BULLETIN_ACCENT } from "../shared/palette";
import { SubtitleEntry, renderSubtitleWords } from "../shared/subtitle-renderer";

/** HeadlineCard'a composition katmanından aktarılan düzleştirilmiş veri. */
export interface HeadlineCardItem {
  headline: string;
  /** Narration metni — altyazı yoksa ekranda gösterilir */
  narration?: string;
  /** HTTP URL — backend audio_path'ten dönüştürülmüş */
  audioUrl?: string | null;
  subtitles?: SubtitleEntry[];
  bulletinStyle?: BulletinStyle;
}

interface Props {
  item: HeadlineCardItem;
  /** Sıra indeksi — slayt yönünü (sol/sağ) belirler */
  index?: number;
}

export const HeadlineCard: React.FC<Props> = ({ item, index = 0 }) => {
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

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none", opacity: exitOpacity }}>
      {item.audioUrl && <Audio src={item.audioUrl} />}

      <div style={{
        position: "absolute",
        left: "50%",
        transform: `translateX(calc(-50% + ${slideX}px))`,
        opacity,
        maxWidth: 1400,
        paddingLeft: 80,
        paddingRight: 80,
        textAlign: "center",
      }}>
        {/* Aksant çizgisi */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            height: 6,
            width: `${barScale * 60}%`,
            background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
            borderRadius: 3,
            boxShadow: `0 0 20px ${accent}88`,
          }} />
        </div>

        {/* Manşet */}
        <h1 style={{
          color: "#F5F5F5",
          fontSize: 96,
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
            fontSize: 40,
            fontFamily: '"Montserrat", Arial, sans-serif',
            fontWeight: 400,
            marginTop: 16,
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
            marginTop: 28,
            opacity: subFadeOut,
            fontSize: 32,
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
