/**
 * ContentHub haber bülteni — kelime vurgulu altyazı renderer yardımcısı.
 *
 * HeadlineCard ve diğer bileşenlerde kullanılır.
 * Tek kaynak: kopyalanmaz.
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
 * Aktif SubtitleEntry'i bulup kelime vurgulu veya düz metin olarak render eder.
 */
export function renderSubtitleWords(
  frame: number,
  subtitles: SubtitleEntry[],
  accentColor: string
): React.ReactNode {
  const active = subtitles.find((s) => frame >= s.startFrame && frame < s.endFrame);
  if (!active) return null;

  if (active.words && active.words.length > 0) {
    const introFrames = Math.min(5, Math.floor((active.endFrame - active.startFrame) * 0.12));
    const groupOpacity = interpolate(
      frame,
      [active.startFrame, active.startFrame + introFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const groupY = interpolate(
      frame,
      [active.startFrame, active.startFrame + introFrames],
      [10, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return (
      <span style={{ opacity: groupOpacity, transform: `translateY(${groupY}px)`, display: "inline" }}>
        {active.words.map((w, i) => {
          const isActive = frame >= w.startFrame && frame < w.endFrame;
          const isPast = frame >= w.endFrame;
          return (
            <span
              key={i}
              style={{
                color: isActive ? accentColor : isPast ? "#FFFFFF" : "#AAAAAA",
                opacity: isActive ? 1 : isPast ? 0.9 : 0.45,
                textShadow: isActive
                  ? `-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 16px ${accentColor}CC`
                  : "0 2px 8px rgba(0,0,0,0.8)",
                display: "inline-block",
                marginRight: "0.22em",
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
