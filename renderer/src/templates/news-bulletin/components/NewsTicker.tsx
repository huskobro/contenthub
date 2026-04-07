import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BulletinStyle } from "./StudioBackground";
import { BULLETIN_ACCENT } from "../shared/palette";
import { getCommonLabel } from "../utils/localization";

interface TickerItem { text: string; }

interface Props {
  items: TickerItem[];
  lang?: string;
  style?: BulletinStyle;
}

const TICKER_HEIGHT = 64;
const CHAR_WIDTH = 18;
const SEPARATOR = "   ◆   ";

export const NewsTicker: React.FC<Props> = ({ items, lang = "tr", style = "breaking" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const accent = BULLETIN_ACCENT[style] ?? BULLETIN_ACCENT.breaking;

  if (!items || items.length === 0) return null;

  const rawText = items.map((t) => t.text).join(SEPARATOR) + SEPARATOR;
  const fullText = rawText + rawText + rawText;

  const SPEED = 4;
  const tickerX = interpolate(frame, [0, durationInFrames], [0, -SPEED * durationInFrames], { extrapolateRight: "clamp" });
  const rawWidth = rawText.length * CHAR_WIDTH;
  const wrappedX = ((tickerX % rawWidth) - rawWidth) % rawWidth;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: TICKER_HEIGHT, backgroundColor: "rgba(10,10,10,0.94)",
        display: "flex", alignItems: "center", overflow: "hidden",
        borderTop: `2px solid ${accent}`, boxShadow: `0 -4px 24px ${accent}44`,
      }}>
        <div style={{
          flexShrink: 0, background: accent, height: "100%",
          paddingLeft: 24, paddingRight: 24, display: "flex", alignItems: "center",
          zIndex: 2, boxShadow: `4px 0 20px ${accent}88`,
        }}>
          <span style={{ color: "#FFFFFF", fontSize: 22, fontFamily: '"Bebas Neue", "Oswald", sans-serif', letterSpacing: "0.14em", fontWeight: 900 }}>
            {getCommonLabel("news", lang)}
          </span>
        </div>
        <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center" }}>
          <div style={{ whiteSpace: "nowrap", transform: `translateX(${wrappedX}px)`, willChange: "transform" }}>
            <span style={{ color: "#FFFFFF", fontSize: 28, fontFamily: '"Montserrat", Arial, sans-serif', fontWeight: 500, letterSpacing: "0.03em" }}>
              {fullText}
            </span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 120, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right, rgba(10,10,10,0.94), transparent)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(to left, rgba(10,10,10,0.94), transparent)", pointerEvents: "none", zIndex: 1 }} />
      </div>
    </AbsoluteFill>
  );
};
