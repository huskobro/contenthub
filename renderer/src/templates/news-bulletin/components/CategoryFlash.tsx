/**
 * CategoryFlash — haber geçişi sırasında kategori etiketini gösterir.
 *
 * Sequence içinde render edilir; kendi durationInFrames'i CATEGORY_FLASH_DUR'dur.
 * Giriş: soldan yay, Çıkış: sağa yay.
 *
 * Animasyon kararları (ContentHub):
 *   - Toplam gösterim: CATEGORY_FLASH_DUR frame
 *   - Çıkış başlar: toplam sürenin son %25'inde
 *   - Spring damping/stiffness: standart ContentHub broadcast değerleri
 */

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  label: string;
  accent: string;
}

/** CategoryFlash'ın kaç frame süreceği — composition'da Sequence süresi olarak kullanılır. */
export const CATEGORY_FLASH_DUR = 75; // 1.25s @ 60fps — ContentHub tercihi

export const CategoryFlash: React.FC<Props> = ({ label, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Çıkış, toplam sürenin son %22'sinde başlar
  const EXIT_FRAME = Math.floor(CATEGORY_FLASH_DUR * 0.78);

  const enterProgress = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const enterX = interpolate(enterProgress, [0, 1], [-1100, 0]);

  const exitProgress = spring({
    frame: Math.max(0, frame - EXIT_FRAME),
    fps,
    config: { damping: 16, stiffness: 180 },
  });
  const exitX = interpolate(exitProgress, [0, 1], [0, 1200]);

  const badgeX = frame < EXIT_FRAME ? enterX : exitX;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        top: "38%",
        left: 0, right: 0,
        height: 120,
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{
          transform:       `translateX(${badgeX}px)`,
          backgroundColor: accent,
          height:          "100%",
          display:         "flex",
          alignItems:      "center",
          paddingLeft:     72,
          paddingRight:    56,
          clipPath:        "polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%)",
          boxShadow:       `0 0 40px ${accent}66`,
          minWidth:        380,
        }}>
          <span style={{
            color:       "#FFF",
            fontSize:    56,
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
        top:       "calc(38% + 122px)",
        left: 0, right: 0,
        height:    2,
        background: `linear-gradient(to right, transparent, ${accent}66, transparent)`,
        transform:  `translateX(${badgeX}px)`,
      }} />
    </AbsoluteFill>
  );
};
