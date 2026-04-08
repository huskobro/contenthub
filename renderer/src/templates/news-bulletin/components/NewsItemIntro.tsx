/**
 * NewsItemIntro — Her haberin başında gösterilen kısa branded intro panel.
 *
 * Haber numarası, kısa başlık ve kategori rengi ile dolu bir panel.
 * showItemIntro setting'i true ise composition timeline'a eklenir.
 *
 * Animasyonlar:
 *   - Arka plan panel: sol taraftan spring slide-in
 *   - Haber numarası: büyük font, accent rengi, scale animasyonu
 *   - Başlık metni: 8 frame gecikmeyle fade+slide
 *   - Çıkış: sağa slide-out
 *
 * M43: ContentHub-native — kendi yapımıza uygun branded intro.
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface Props {
  /** Haber numarası (1-indexed) */
  itemNumber: number;
  /** Kısa başlık (manşet) */
  headline: string;
  /** Kategori accent rengi */
  accent: string;
  /** Arka plan rengi (kategori bg) */
  bgColor?: string;
  /** Kanal/ağ adı */
  networkName?: string;
  /** Portrait (9:16) veya landscape (16:9) */
  isPortrait?: boolean;
}

export const NewsItemIntro: React.FC<Props> = ({
  itemNumber,
  headline,
  accent,
  bgColor,
  networkName = "ContentHub",
  isPortrait = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Çıkış animasyonu son %25'te
  const EXIT_START = Math.floor(durationInFrames * 0.75);

  // Giriş animasyonları
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  const exitProgress = spring({
    frame: Math.max(0, frame - EXIT_START),
    fps,
    config: { damping: 16, stiffness: 200 },
  });

  // Panel slide — portrait: alttan, landscape: soldan
  const panelEnter = isPortrait
    ? interpolate(enterProgress, [0, 1], [200, 0])
    : interpolate(enterProgress, [0, 1], [-300, 0]);

  const panelExit = isPortrait
    ? interpolate(exitProgress, [0, 1], [0, -200])
    : interpolate(exitProgress, [0, 1], [0, 300]);

  const panelTranslate = frame < EXIT_START ? panelEnter : panelExit;
  const panelTransform = isPortrait
    ? `translateY(${panelTranslate}px)`
    : `translateX(${panelTranslate}px)`;

  // Opacity
  const enterOpacity = interpolate(enterProgress, [0, 0.3, 1], [0, 1, 1]);
  const exitOpacity = interpolate(exitProgress, [0, 0.5, 1], [1, 0.6, 0]);
  const opacity = frame < EXIT_START ? enterOpacity : exitOpacity;

  // Numara scale animasyonu
  const numScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 250 },
  });
  const numberScale = interpolate(numScale, [0, 1], [0.3, 1]);

  // Başlık gecikmelı giriş
  const titleProgress = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  const titleOpacity = interpolate(titleProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleSlideY = interpolate(titleProgress, [0, 1], [15, 0]);

  // Boyutlar
  const panelH = isPortrait ? 280 : 200;
  const numFontSize = isPortrait ? 120 : 96;
  const headlineFontSize = isPortrait ? 44 : 36;
  const networkFontSize = isPortrait ? 22 : 18;
  const padH = isPortrait ? 60 : 80;

  // Başlığı kısalt (çok uzunsa)
  const shortHeadline = headline.length > 60
    ? headline.substring(0, 57) + "..."
    : headline;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          transform: `translateY(-50%) ${panelTransform}`,
          opacity,
          height: panelH,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Accent bar — sol kenar */}
        <div
          style={{
            width: isPortrait ? 8 : 10,
            height: "100%",
            backgroundColor: accent,
            flexShrink: 0,
            boxShadow: `0 0 30px ${accent}88`,
          }}
        />

        {/* İçerik paneli */}
        <div
          style={{
            flex: 1,
            height: "100%",
            backgroundColor: bgColor ?? "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: padH,
            paddingRight: padH,
            gap: isPortrait ? 40 : 48,
          }}
        >
          {/* Haber numarası */}
          <div
            style={{
              transform: `scale(${numberScale})`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: numFontSize,
                fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
                fontWeight: 900,
                color: accent,
                letterSpacing: "0.05em",
                textShadow: `0 0 40px ${accent}66`,
              }}
            >
              {String(itemNumber).padStart(2, "0")}
            </span>
          </div>

          {/* Başlık + network */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              overflow: "hidden",
              opacity: titleOpacity,
              transform: `translateY(${titleSlideY}px)`,
            }}
          >
            <span
              style={{
                fontSize: headlineFontSize,
                fontFamily: '"Montserrat", Arial, sans-serif',
                fontWeight: 700,
                color: "#F5F5F5",
                lineHeight: 1.2,
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {shortHeadline}
            </span>
            {networkName && (
              <span
                style={{
                  fontSize: networkFontSize,
                  fontFamily: '"Inter", Arial, sans-serif',
                  fontWeight: 500,
                  color: accent,
                  marginTop: 6,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {networkName}
              </span>
            )}
          </div>
        </div>

        {/* Accent bar — sağ kenar */}
        <div
          style={{
            width: isPortrait ? 8 : 10,
            height: "100%",
            backgroundColor: accent,
            flexShrink: 0,
            boxShadow: `0 0 30px ${accent}88`,
          }}
        />
      </div>

      {/* Alt ve üst accent çizgisi */}
      <div
        style={{
          position: "absolute",
          top: `calc(50% + ${panelH / 2 + 4}px)`,
          left: "10%",
          right: "10%",
          height: 2,
          background: `linear-gradient(to right, transparent, ${accent}66, transparent)`,
          opacity: opacity * 0.7,
          transform: panelTransform,
        }}
      />
    </AbsoluteFill>
  );
};
