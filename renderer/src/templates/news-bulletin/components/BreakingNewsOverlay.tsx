/**
 * BreakingNewsOverlay — yalnızca "breaking" stilinde ilk saniyeler gösterilir.
 *
 * M41a: Portrait layout desteği eklendi.
 */

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BulletinStyle } from "./StudioBackground";
import { BULLETIN_ACCENT, BULLETIN_DARK_ACCENT } from "../shared/palette";
import { getLabel } from "../utils/localization";

interface Props {
  networkName: string;
  lang?: string;
  style?: BulletinStyle;
  isPortrait?: boolean;
}

export const BreakingNewsOverlay: React.FC<Props> = ({
  networkName,
  lang = "tr",
  style = "breaking",
  isPortrait = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent     = BULLETIN_ACCENT[style]      ?? BULLETIN_ACCENT.breaking;
  const darkAccent = BULLETIN_DARK_ACCENT[style] ?? BULLETIN_DARK_ACCENT.breaking;
  const labelText  = getLabel(style, lang);

  // Badge: soldan sürgülü giriş
  const badgeProgress = spring({ frame, fps, config: { damping: 15, stiffness: 190 } });
  const badgeX        = interpolate(badgeProgress, [0, 1], [isPortrait ? -400 : -640, 0]);

  // Ağ adı: 8 frame gecikmeli sağdan giriş
  const nameProgress = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 15, stiffness: 190 } });
  const nameX        = interpolate(nameProgress, [0, 1], [isPortrait ? 200 : 360, 0]);
  const nameOpacity  = interpolate(nameProgress, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });

  // İlk 30 frame: dikkat çekici parlaklık dalgası
  const flashOpacity =
    frame < 30
      ? interpolate(Math.abs(Math.sin((frame / 30) * Math.PI * 3)), [0, 1], [0.55, 1.0])
      : 1.0;

  const barH = isPortrait ? 60 : 88;
  const badgeFontSize = isPortrait ? 28 : 40;
  const nameFontSize = isPortrait ? 22 : 34;
  const padLeft = isPortrait ? 32 : 56;
  const padRight = isPortrait ? 20 : 36;
  const clipOffset = isPortrait ? 18 : 28;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position:   "absolute",
        top:        isPortrait ? "35%" : "38%",
        left: 0, right: 0,
        height:     barH,
        display:    "flex",
        alignItems: "center",
      }}>
        {/* Kategori etiketi */}
        <div style={{
          transform:  `translateX(${badgeX}px)`,
          opacity:    flashOpacity,
          background: `linear-gradient(135deg, ${accent} 0%, ${darkAccent} 100%)`,
          paddingLeft:  padLeft,
          paddingRight: padRight,
          height:       "100%",
          display:      "flex",
          alignItems:   "center",
          clipPath:     `polygon(0 0, calc(100% - ${clipOffset}px) 0, 100% 50%, calc(100% - ${clipOffset}px) 100%, 0 100%)`,
          boxShadow:    `0 0 36px ${accent}77`,
        }}>
          <span style={{
            color:         "#FFFFFF",
            fontSize:      badgeFontSize,
            fontFamily:    '"Bebas Neue", "Oswald", sans-serif',
            letterSpacing: "0.12em",
            fontWeight:    900,
            textShadow:    "1px 1px 3px rgba(0,0,0,0.5)",
          }}>
            {labelText}
          </span>
        </div>

        {/* Ağ adı */}
        <div style={{
          transform:   `translateX(${nameX}px)`,
          opacity:     nameOpacity,
          marginLeft:  isPortrait ? 10 : 18,
          flex:        1,
        }}>
          <span style={{
            color:         "#FFFFFF",
            fontSize:      nameFontSize,
            fontFamily:    '"Montserrat", Arial, sans-serif',
            fontWeight:    700,
            letterSpacing: "0.07em",
            textShadow:    "0 2px 10px rgba(0,0,0,0.9)",
          }}>
            {networkName.toUpperCase()}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
