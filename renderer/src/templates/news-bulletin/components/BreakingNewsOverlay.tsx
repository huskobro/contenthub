import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BulletinStyle } from "./StudioBackground";
import { BULLETIN_ACCENT, BULLETIN_DARK_ACCENT } from "../shared/palette";
import { getLabel } from "../utils/localization";

interface Props {
  networkName: string;
  lang?: string;
  style?: BulletinStyle;
}

export const BreakingNewsOverlay: React.FC<Props> = ({ networkName, lang = "tr", style = "breaking" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = BULLETIN_ACCENT[style] ?? BULLETIN_ACCENT.breaking;
  const darkAccent = BULLETIN_DARK_ACCENT[style] ?? BULLETIN_DARK_ACCENT.breaking;
  const labelText = getLabel(style, lang);

  const badgeProgress = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const badgeX = interpolate(badgeProgress, [0, 1], [-600, 0]);

  const nameProgress = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14, stiffness: 200 } });
  const nameX = interpolate(nameProgress, [0, 1], [400, 0]);
  const nameOpacity = interpolate(nameProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  const flashOpacity =
    frame < 30
      ? interpolate(Math.abs(Math.sin((frame / 30) * Math.PI * 3)), [0, 1], [0.6, 1.0])
      : 1.0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "38%", left: 0, right: 0, display: "flex", alignItems: "center", height: 90 }}>
        <div style={{
          transform: `translateX(${badgeX}px)`,
          opacity: flashOpacity,
          background: `linear-gradient(135deg, ${accent} 0%, ${darkAccent} 100%)`,
          paddingLeft: 60,
          paddingRight: 40,
          height: "100%",
          display: "flex",
          alignItems: "center",
          clipPath: "polygon(0 0, calc(100% - 30px) 0, 100% 50%, calc(100% - 30px) 100%, 0 100%)",
          boxShadow: `0 0 40px ${accent}88`,
        }}>
          <span style={{
            color: "#FFFFFF",
            fontSize: 42,
            fontFamily: '"Bebas Neue", "Oswald", sans-serif',
            letterSpacing: "0.12em",
            fontWeight: 900,
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          }}>
            {labelText}
          </span>
        </div>
        <div style={{ transform: `translateX(${nameX}px)`, opacity: nameOpacity, marginLeft: 20, flex: 1 }}>
          <span style={{
            color: "#FFFFFF",
            fontSize: 36,
            fontFamily: '"Montserrat", "Arial", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.08em",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
          }}>
            {networkName.toUpperCase()}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
