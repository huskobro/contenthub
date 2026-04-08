/**
 * ContentHub haber bülteni — kelime vurgulu altyazı renderer yardımcısı — M42.
 *
 * HeadlineCard ve diğer bileşenlerde kullanılır.
 * Tek kaynak: kopyalanmaz.
 *
 * M42: 3-state kelime rengi (future/active/past), scale animasyonu ve
 *      fontWeight/letterSpacing artışı eklendi.
 *      YTRobot NewsBulletin9x16 renderSubtitles mantığından adapte edilmiştir.
 */

import React from "react";
import { interpolate } from "remotion";

export interface SubtitleWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  words?: SubtitleWord[];
}

/**
 * Safe interpolate — sıfır-uzunluklu range'de crash olmaz.
 */
function lerp(
  f: number,
  inRange: [number, number],
  outRange: [number, number]
): number {
  if (inRange[0] >= inRange[1]) return outRange[1];
  return interpolate(f, inRange, outRange, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/**
 * zoom_in: initScale → (1 + overshoot) → 1.0
 * Aktif word'ün giriş animasyonu.
 */
function zoomIn(
  f: number,
  start: number,
  dur: number,
  initScale: number,
  overshoot: number,
  peakFrac: number
): number {
  if (dur <= 0) return 1.0;
  const peak = start + Math.max(1, Math.floor(dur * peakFrac));
  const end = start + dur;
  if (f < peak) return lerp(f, [start, peak], [initScale, 1 + overshoot]);
  return lerp(f, [peak, end], [1 + overshoot, 1.0]);
}

/**
 * Aktif SubtitleEntry'i bulup kelime vurgulu veya düz metin olarak render eder.
 *
 * Kelime durumları:
 *   future : soluk (#AAAAAA, opacity 0.45) — henüz söylenmedi
 *   active : vurgulu (accentColor, tam opacity, scale + glow) — şu an söyleniyor
 *   past   : belirgin (#FFFFFF, opacity 0.9) — söylendi
 *
 * Segment entrance: slide-up 12px + fade-in (5 frame veya segment süresinin %12'si).
 */
export function renderSubtitleWords(
  frame: number,
  subtitles: SubtitleEntry[],
  accentColor: string
): React.ReactNode {
  const active = subtitles.find((s) => frame >= s.startFrame && frame < s.endFrame);
  if (!active) return null;

  if (active.words && active.words.length > 0) {
    const segDur = Math.max(1, active.endFrame - active.startFrame);
    const introFrames = Math.min(5, Math.floor(segDur * 0.12));

    // Segment entrance: slide-up + fade-in
    const groupOpacity = lerp(frame, [active.startFrame, active.startFrame + introFrames], [0, 1]);
    const groupY = lerp(frame, [active.startFrame, active.startFrame + introFrames], [12, 0]);

    return (
      <span style={{ opacity: groupOpacity, transform: `translateY(${groupY}px)`, display: "inline" }}>
        {active.words.map((w, i) => {
          const isActive = frame >= w.startFrame && frame < w.endFrame;
          const isPast   = frame >= w.endFrame;
          const wDur     = Math.max(1, w.endFrame - w.startFrame);
          const animDur  = Math.min(5, wDur);

          // zoom_in: 0.8 → 1.05 → 1.0 (hype preset)
          const wordScale = isActive
            ? zoomIn(frame, w.startFrame, animDur, 0.8, 0.05, 0.7)
            : 1.0;

          // 3-state renk
          const color   = isActive ? accentColor : isPast ? "#FFFFFF" : "#AAAAAA";
          const opacity = isActive ? 1.0 : isPast ? 0.9 : 0.45;
          const textShadow = isActive
            ? `-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 16px ${accentColor}CC`
            : "0 2px 8px rgba(0,0,0,0.8)";

          return (
            <span
              key={i}
              style={{
                color,
                opacity,
                textShadow,
                display: "inline-block",
                marginRight: "0.22em",
                transform: `scale(${wordScale})`,
                fontWeight: isActive ? 700 : undefined,
                letterSpacing: isActive ? "0.03em" : undefined,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </span>
    );
  }

  return <span style={{ color: "#FFFFFF" }}>{active.text}</span>;
}
