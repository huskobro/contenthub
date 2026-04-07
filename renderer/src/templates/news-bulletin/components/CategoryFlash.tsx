/**
 * CategoryFlash — haber geçişi sırasında kategori etiketini gösterir.
 *
 * Sequence içinde render edilir; kendi durationInFrames'i CATEGORY_FLASH_DUR'dur.
 * Giriş: soldan yay, Çıkış: sağa yay.
 *
 * M41a: Portrait layout desteği eklendi.
 */

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  label: string;
  accent: string;
  isPortrait?: boolean;
}

/** CategoryFlash'ın kaç frame süreceği — composition'da Sequence süresi olarak kullanılır. */
export const CATEGORY_FLASH_DUR = 75; // 1.25s @ 60fps — ContentHub tercihi

export const CategoryFlash: React.FC<Props> = ({ label, accent, isPortrait = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Çıkış, toplam sürenin son %22'sinde başlar
  const EXIT_FRAME = Math.floor(CATEGORY_FLASH_DUR * 0.78);

  const enterProgress = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const enterX = interpolate(enterProgress, [0, 1], [isPortrait ? -700 : -1100, 0]);

  const exitProgress = spring({
    frame: Math.max(0, frame - EXIT_FRAME),
    fps,
    config: { damping: 16, stiffness: 180 },
  });
  const exitX = interpolate(exitProgress, [0, 1], [0, isPortrait ? 800 : 1200]);

  const badgeX = frame < EXIT_FRAME ? enterX : exitX;

  const badgeH = isPortrait ? 80 : 120;
  const fontSize = isPortrait ? 36 : 56;
  const padLeft = isPortrait ? 40 : 72;
  const padRight = isPortrait ? 32 : 56;
  const minW = isPortrait ? 240 : 380;
  const clipOffset = isPortrait ? 18 : 28;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        top: isPortrait ? "35%" : "38%",
        left: 0, right: 0,
        height: badgeH,
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{
          transform:       `translateX(${badgeX}px)`,
          backgroundColor: accent,
          height:          "100%",
          display:         "flex",
          alignItems:      "center",
          paddingLeft:     padLeft,
          paddingRight:    padRight,
          clipPath:        `polygon(0 0, calc(100% - ${clipOffset}px) 0, 100% 50%, calc(100% - ${clipOffset}px) 100%, 0 100%)`,
          boxShadow:       `0 0 40px ${accent}66`,
          minWidth:        minW,
        }}>
          <span style={{
            color:       "#FFF",
            fontSize:    fontSize,
            fontFamily:  '"Bebas Neue", "Oswald", Impact, sans-serif',
            letterSpacing: "0.11em",
            fontWeight:  900,
          }}>
            {label}
          </span>
        </div>
      </div>
      {/* Alt yatay aksant çizgisi */}
      <div style={{
        position:  "absolute",
        top:       `calc(${isPortrait ? "35%" : "38%"} + ${badgeH + 2}px)`,
        left: 0, right: 0,
        height:    2,
        background: `linear-gradient(to right, transparent, ${accent}66, transparent)`,
        transform:  `translateX(${badgeX}px)`,
      }} />
    </AbsoluteFill>
  );
};
