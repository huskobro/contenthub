/**
 * CategoryFlash — haber geçişi sırasında kategori etiketini gösterir.
 *
 * Sequence içinde render edilir; durationInFrames = categoryFlashDurFrames.
 * Portrait: yukarıdan aşağı slide (9:16 dikey uyum)
 * Landscape: soldan sağa slide (16:9 yatay uyum)
 *
 * M43: Duration setting'den dinamik, categoryStyleMapping ile renk override.
 * ContentHub-native — kendi yapımıza uygun, YTRobot'tan görsel ilham.
 */

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  label: string;
  accent: string;
  isPortrait?: boolean;
  /** M43: Flash süresi (frame). Undefined ise varsayılan CATEGORY_FLASH_DUR kullanılır. */
  durationFrames?: number;
}

/**
 * Varsayılan CategoryFlash süresi (frame).
 * M43: Backend'den categoryFlashDuration (saniye) gelir, fps ile çarpılarak frame'e çevrilir.
 * Bu sabit sadece fallback.
 */
export const CATEGORY_FLASH_DUR = 90; // 1.5s @ 60fps — M43 varsayılan

export const CategoryFlash: React.FC<Props> = ({
  label,
  accent,
  isPortrait = false,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalDur = durationFrames ?? CATEGORY_FLASH_DUR;

  // Çıkış, frame 68'de başlar (toplam sürenin ~%75'i)
  const EXIT_FRAME = Math.min(Math.floor(totalDur * 0.75), totalDur - 10);

  // Spring animasyon — snappy giriş
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 200 },
  });

  const exitProgress = spring({
    frame: Math.max(0, frame - EXIT_FRAME),
    fps,
    config: { damping: 14, stiffness: 200 },
  });

  // Portrait: dikey hareket (yukarıdan), Landscape: yatay (soldan)
  const enterTranslate = isPortrait
    ? interpolate(enterProgress, [0, 1], [-160, 0])
    : interpolate(enterProgress, [0, 1], [-1000, 0]);

  const exitTranslate = isPortrait
    ? interpolate(exitProgress, [0, 1], [0, 300])
    : interpolate(exitProgress, [0, 1], [0, 1200]);

  const translate = frame < EXIT_FRAME ? enterTranslate : exitTranslate;
  const transformProp = isPortrait
    ? `translateY(${translate}px)`
    : `translateX(${translate}px)`;

  // Opacity — giriş ve çıkışta fade
  const enterOpacity = interpolate(enterProgress, [0, 0.3, 1], [0, 1, 1]);
  const exitOpacity = interpolate(exitProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const opacity = frame < EXIT_FRAME ? enterOpacity : exitOpacity;

  // Boyutlar
  const badgeH = isPortrait ? 90 : 130;
  const fontSize = isPortrait ? 88 : 60;
  const letterSpacing = isPortrait ? "0.14em" : "0.12em";
  const padH = isPortrait ? 72 : 80;
  const padV = isPortrait ? 20 : 0;
  const clipOffset = isPortrait ? 0 : 28;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        top: isPortrait ? "42%" : "38%",
        left: 0,
        right: 0,
        height: badgeH,
        display: "flex",
        alignItems: isPortrait ? "center" : "center",
        justifyContent: isPortrait ? "center" : "flex-start",
      }}>
        <div style={{
          transform: transformProp,
          opacity,
          backgroundColor: accent,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isPortrait ? "center" : "flex-start",
          paddingLeft: padH,
          paddingRight: padH,
          paddingTop: padV,
          paddingBottom: padV,
          clipPath: isPortrait
            ? undefined
            : `polygon(0 0, calc(100% - ${clipOffset}px) 0, 100% 50%, calc(100% - ${clipOffset}px) 100%, 0 100%)`,
          boxShadow: `0 0 60px ${accent}88`,
          textShadow: `0 2px 12px rgba(0,0,0,0.4)`,
        }}>
          <span style={{
            color: "#FFF",
            fontSize,
            fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
            letterSpacing,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}>
            {label}
          </span>
        </div>
      </div>

      {/* Alt aksant çizgisi — gradient glow */}
      <div style={{
        position: "absolute",
        top: isPortrait
          ? `calc(42% + ${badgeH + 4}px)`
          : `calc(38% + ${badgeH + 2}px)`,
        left: 0,
        right: 0,
        height: isPortrait ? 3 : 2,
        background: `linear-gradient(to right, transparent, ${accent}88, transparent)`,
        transform: transformProp,
        opacity: opacity * 0.8,
        filter: "blur(1px)",
      }} />
    </AbsoluteFill>
  );
};
