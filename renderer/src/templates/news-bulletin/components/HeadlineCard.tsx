/**
 * HeadlineCard — Haber bülteni tek haber kartı bileşeni.
 *
 * Portrait (9:16) modda 4 layout otomatik seçilir (YTRobot NewsBulletin9x16 mantığından adapte):
 *   Layout169      : Üst %38 panel görsel, alt metin bloğu (16:9 görsel)
 *   Layout916      : Full-bleed arka plan görsel, alt %48 metin bölgesi
 *   LayoutNoMedia  : Görsel yok, metin ortalı, dekoratif diagonal çizgiler
 *
 * Landscape (16:9) modda mevcut ortalı kart düzeni korunur.
 *
 * Karaoke: subtitle-renderer.tsx'ten renderSubtitleWords (3-state, scale animasyonu).
 *
 * M41: imageTimeline crossfade desteği.
 * M41a: portrait layout flag.
 * M42: portrait için YTRobot-native layout sistemi.
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BulletinStyle, CategoryStyleMapping } from "./StudioBackground";
import { BULLETIN_ACCENT, resolveAccent } from "../shared/palette";
import { SubtitleEntry, renderSubtitleWords } from "../shared/subtitle-renderer";

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

/** M41: Per-item image timeline segmenti */
export interface ImageTimelineSegment {
  url: string;
  startSeconds: number;
  durationSeconds: number;
}

/** HeadlineCard'a composition katmanından aktarılan düzleştirilmiş veri. */
export interface HeadlineCardItem {
  headline: string;
  narration?: string;
  audioUrl?: string | null;
  subtitles?: SubtitleEntry[];
  bulletinStyle?: BulletinStyle;
  imagePath?: string | null;
  imageTimeline?: ImageTimelineSegment[] | null;
}

interface Props {
  item: HeadlineCardItem;
  index?: number;
  isPortrait?: boolean;
  /** M43: Ken Burns efekti aktif mi */
  imageKenBurns?: boolean;
  /** M43: Kategori stil eşleme tablosu (admin panelden) */
  categoryStyleMapping?: CategoryStyleMapping | null;
  /** M43: Medya aspect ratio ipucu — layout seçimi için */
  mediaAspect?: string;
}

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const CROSSFADE_FRAMES = 6;
const NETWORK_BAR_H    = 64;  // portrait top bar yüksekliği (NewsBulletinComposition ile tutarlı)
const TICKER_H         = 56;  // portrait ticker yüksekliği

// ---------------------------------------------------------------------------
// Crossfade yardımcısı
// ---------------------------------------------------------------------------

function getSegmentOpacity(
  currentTimeSec: number,
  seg: ImageTimelineSegment,
  fps: number,
): number {
  const segEnd    = seg.startSeconds + seg.durationSeconds;
  const fadeDur   = CROSSFADE_FRAMES / fps;

  if (currentTimeSec < seg.startSeconds + fadeDur) {
    const t = (currentTimeSec - seg.startSeconds) / fadeDur;
    return Math.max(0, Math.min(1, t));
  }
  if (currentTimeSec > segEnd - fadeDur) {
    const t = (segEnd - currentTimeSec) / fadeDur;
    return Math.max(0, Math.min(1, t));
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Aktif görsel URL çözücü
// ---------------------------------------------------------------------------

function resolveActiveImage(
  item: HeadlineCardItem,
  currentTimeSec: number,
): string | null {
  const tl = item.imageTimeline;
  if (tl && tl.length > 0) {
    for (const seg of tl) {
      if (currentTimeSec >= seg.startSeconds && currentTimeSec < seg.startSeconds + seg.durationSeconds) {
        return seg.url;
      }
    }
    return tl[tl.length - 1].url; // fallback: son segment
  }
  return item.imagePath ?? null;
}

// ---------------------------------------------------------------------------
// Safe interpolate
// ---------------------------------------------------------------------------

function lerp(f: number, inRange: [number, number], outRange: [number, number]): number {
  if (inRange[0] >= inRange[1]) return outRange[1];
  return interpolate(f, inRange, outRange, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

// ---------------------------------------------------------------------------
// Portrait metin bloğu — Layout169 ve LayoutNoMedia'da paylaşılır
// ---------------------------------------------------------------------------

interface TextBlockProps {
  item: HeadlineCardItem;
  accent: string;
  frame: number;
  fps: number;
  durationInFrames: number;
  index: number;
  /** fillHeight: flex:1 ile tüm alanı kapla */
  fillHeight?: boolean;
  headlineFontSize?: number;
  subtextFontSize?: number;
  karaokesFontSize?: number;
}

const PortraitTextBlock: React.FC<TextBlockProps> = ({
  item, accent, frame, fps, durationInFrames, index,
  fillHeight = false,
  headlineFontSize = 84,
  subtextFontSize = 40,
  karaokesFontSize = 38,
}) => {
  const fromLeft = index % 2 === 0;

  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const slideX   = interpolate(progress, [0, 1], [fromLeft ? -80 : 80, 0]);
  const opacity  = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const subProgress = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 14, stiffness: 180 } });
  const subY        = interpolate(subProgress, [0, 1], [20, 0]);
  const subOpacity  = interpolate(subProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  const subFadeOut = frame >= durationInFrames - 12
    ? lerp(frame, [durationInFrames - 12, durationInFrames], [1, 0])
    : 1;

  const hasSubtitles = item.subtitles && item.subtitles.length > 0;

  return (
    <div style={{
      transform: `translateX(${slideX}px)`,
      opacity,
      display: "flex",
      flexDirection: "column",
      height: fillHeight ? "100%" : undefined,
    }}>
      {/* Aksan çizgisi */}
      <div style={{
        height: 5,
        width: "55%",
        background: `linear-gradient(to right, ${accent}, transparent)`,
        borderRadius: 3,
        boxShadow: `0 0 20px ${accent}88`,
        marginBottom: 18,
        flexShrink: 0,
      }} />

      {/* Manşet */}
      <h1 style={{
        color: "#F5F5F5",
        fontSize: headlineFontSize,
        fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
        letterSpacing: "0.06em",
        lineHeight: 1.0,
        margin: "0 0 18px 0",
        textShadow: `0 0 60px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.9), 0 0 120px ${accent}33`,
        flexShrink: 0,
      }}>
        {item.headline}
      </h1>

      {/* Karaoke altyazı — varsa narration'ı gizler */}
      {hasSubtitles && (
        <div style={{
          opacity: subFadeOut,
          fontSize: karaokesFontSize,
          fontFamily: '"Montserrat", Arial, sans-serif',
          fontWeight: 600,
          color: "#FFFFFF",
          textShadow: "0 2px 12px rgba(0,0,0,0.95)",
          lineHeight: 1.6,
          flex: fillHeight ? 1 : undefined,
        }}>
          {renderSubtitleWords(frame, item.subtitles!, accent)}
        </div>
      )}

      {/* Narration — karaoke yoksa */}
      {!hasSubtitles && item.narration && (
        <p style={{
          color: "rgba(220,220,220,0.92)",
          fontSize: subtextFontSize,
          fontFamily: '"Montserrat", Arial, sans-serif',
          fontWeight: 400,
          margin: "0 0 24px 0",
          letterSpacing: "0.03em",
          lineHeight: 1.6,
          textShadow: "0 2px 12px rgba(0,0,0,0.9)",
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          flex: fillHeight ? 1 : undefined,
        }}>
          {item.narration}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Portrait Layout A: 16:9 görsel üst panel, metin alt blok
// ---------------------------------------------------------------------------

const PortraitLayout169: React.FC<{
  item: HeadlineCardItem; accent: string; frame: number;
  fps: number; durationInFrames: number; index: number;
  currentTimeSec: number;
}> = ({ item, accent, frame, fps, durationInFrames, index, currentTimeSec }) => {

  const imgScale = imageKenBurns ? lerp(frame, [0, 300], [1.0, 1.06]) : 1.0;
  const IMAGE_TOP = NETWORK_BAR_H + 8;
  const IMAGE_H   = 720; // ~37% of 1920

  // Görseli belirle (timeline veya tekil)
  const tl = item.imageTimeline;
  const hasMultiple = tl && tl.length > 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Üst görsel paneli */}
      <div style={{ position: "absolute", top: IMAGE_TOP, left: 0, right: 0, height: IMAGE_H, overflow: "hidden" }}>
        {hasMultiple ? (
          tl!.map((seg, i) => {
            const cfDur  = CROSSFADE_FRAMES / fps;
            const segEnd = seg.startSeconds + seg.durationSeconds;
            if (currentTimeSec < seg.startSeconds - cfDur || currentTimeSec >= segEnd + cfDur) return null;
            const segOp = getSegmentOpacity(currentTimeSec, seg, fps);
            return (
              <Img key={i} src={seg.url} style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                transform: `scale(${imgScale})`, transformOrigin: "center center",
                opacity: segOp,
              }} />
            );
          })
        ) : (
          <Img src={resolveActiveImage(item, currentTimeSec)!} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${imgScale})`, transformOrigin: "center center",
          }} />
        )}
        {/* Alt kenara doğru koyu gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.92) 100%)" }} />
        {/* Aksan çizgisi (görsel altı) */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, transparent, ${accent}, transparent)` }} />
      </div>

      {/* Metin bloğu — görsel altından başlar */}
      <div style={{
        position: "absolute",
        top: IMAGE_TOP + IMAGE_H + 24,
        left: 0, right: 0,
        bottom: TICKER_H + 16,
        paddingLeft: 60, paddingRight: 60,
        display: "flex", flexDirection: "column", justifyContent: "flex-start",
        overflowY: "hidden",
      }}>
        <PortraitTextBlock
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index} fillHeight
          headlineFontSize={84} subtextFontSize={40} karaokesFontSize={38}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Portrait Layout B: Full-bleed arka plan, metin alt %48
// ---------------------------------------------------------------------------

const PortraitLayout916: React.FC<{
  item: HeadlineCardItem; accent: string; frame: number;
  fps: number; durationInFrames: number; index: number;
  currentTimeSec: number;
}> = ({ item, accent, frame, fps, durationInFrames, index, currentTimeSec }) => {

  const mediaOpacity = lerp(frame, [0, 20], [0, 1]);
  const CONTENT_TOP  = 1920 * 0.52;

  const tl = item.imageTimeline;
  const hasMultiple = tl && tl.length > 1;
  const activeUrl = resolveActiveImage(item, currentTimeSec);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Full-bleed arka plan */}
      <div style={{ position: "absolute", inset: 0, opacity: mediaOpacity }}>
        {hasMultiple ? (
          tl!.map((seg, i) => {
            const cfDur  = CROSSFADE_FRAMES / fps;
            const segEnd = seg.startSeconds + seg.durationSeconds;
            if (currentTimeSec < seg.startSeconds - cfDur || currentTimeSec >= segEnd + cfDur) return null;
            const segOp = getSegmentOpacity(currentTimeSec, seg, fps);
            return (
              <Img key={i} src={seg.url} style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                objectPosition: "center 20%", opacity: segOp,
              }} />
            );
          })
        ) : activeUrl ? (
          <Img src={activeUrl} style={{
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%",
          }} />
        ) : null}
      </div>

      {/* Koyu gradient — üst ve alt */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.92) 100%)",
      }} />

      {/* Metin alanı başlangıç aksan çizgisi */}
      <div style={{
        position: "absolute",
        top: CONTENT_TOP - 4,
        left: 60, right: 60,
        height: 3,
        background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
        boxShadow: `0 0 20px ${accent}88`,
      }} />

      {/* Metin bölgesi */}
      <div style={{
        position: "absolute",
        top: CONTENT_TOP + 8,
        left: 0, right: 0,
        bottom: TICKER_H + 16,
        paddingLeft: 60, paddingRight: 60,
        display: "flex", flexDirection: "column", justifyContent: "flex-start",
      }}>
        <PortraitTextBlock
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index}
          headlineFontSize={84} subtextFontSize={40} karaokesFontSize={38}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Portrait Layout C: Görsel yok — metin ortalı, dekoratif çizgiler
// ---------------------------------------------------------------------------

const PortraitLayoutNoMedia: React.FC<{
  item: HeadlineCardItem; accent: string; frame: number;
  fps: number; durationInFrames: number; index: number;
}> = ({ item, accent, frame, fps, durationInFrames, index }) => {

  const lineOpacity = lerp(frame, [0, 30], [0, 0.06]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Dekoratif diagonal çizgiler (broadcast stili) */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: lineOpacity }} viewBox="0 0 1080 1920">
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={-200 + i * 110} y1={0} x2={200 + i * 110} y2={1920}
            stroke={accent} strokeWidth={1.5} />
        ))}
      </svg>

      {/* Alt dekoratif çizgi */}
      <div style={{
        position: "absolute",
        bottom: TICKER_H + 16,
        left: 60, right: 60,
        height: 2,
        background: `linear-gradient(to right, transparent, ${accent}88, transparent)`,
      }} />

      {/* Metin — dikey ortalı */}
      <div style={{
        position: "absolute",
        top: NETWORK_BAR_H + 80,
        left: 0, right: 0,
        bottom: TICKER_H + 24,
        paddingLeft: 60, paddingRight: 60,
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <PortraitTextBlock
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index} fillHeight
          headlineFontSize={100} subtextFontSize={46} karaokesFontSize={44}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Ana HeadlineCard bileşeni
// ---------------------------------------------------------------------------

export const HeadlineCard: React.FC<Props> = ({
  item, index = 0, isPortrait = false,
  imageKenBurns = true, categoryStyleMapping, mediaAspect,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const style  = item.bulletinStyle ?? "breaking";
  const accent = resolveAccent(style, categoryStyleMapping);

  const currentTimeSec = frame / fps;

  const fadeOutStart = durationInFrames - 18;
  const exitOpacity  = frame >= fadeOutStart
    ? lerp(frame, [fadeOutStart, durationInFrames], [1, 0])
    : 1;

  // ── Portrait mod: YTRobot-native layout sistemi ───────────────────────────
  if (isPortrait) {
    const activeUrl   = resolveActiveImage(item, currentTimeSec);
    const hasImage    = !!activeUrl;

    let layout: React.ReactNode;

    if (!hasImage) {
      layout = (
        <PortraitLayoutNoMedia
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index}
        />
      );
    } else if (mediaAspect === "9:16" || mediaAspect === "9:16-focus") {
      // M43: Full-bleed dikey görsel layout
      layout = (
        <PortraitLayout916
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index}
          currentTimeSec={currentTimeSec}
        />
      );
    } else {
      // 16:9 görsel (varsayılan) veya 1:1 → üst panel layout
      layout = (
        <PortraitLayout169
          item={item} accent={accent} frame={frame} fps={fps}
          durationInFrames={durationInFrames} index={index}
          currentTimeSec={currentTimeSec}
        />
      );
    }

    return (
      <AbsoluteFill style={{ opacity: exitOpacity, pointerEvents: "none" }}>
        {item.audioUrl && <Audio src={item.audioUrl} />}
        {layout}
      </AbsoluteFill>
    );
  }

  // ── Landscape mod: mevcut ortalı kart düzeni ──────────────────────────────
  const fromRight = index % 2 === 1;
  const progress  = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const slideX    = interpolate(progress, [0, 1], [fromRight ? 120 : -120, 0]);
  const opacity   = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const barProgress = spring({ frame, fps, config: { damping: 12, stiffness: 220 } });
  const barScale    = interpolate(barProgress, [0, 1], [0, 1]);

  const subProgress = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, stiffness: 180 } });
  const subOpacity  = interpolate(subProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const subY        = interpolate(subProgress, [0, 1], [20, 0]);

  const subFadeOut = frame >= durationInFrames - 12
    ? lerp(frame, [durationInFrames - 12, durationInFrames], [1, 0])
    : 1;

  const tl = item.imageTimeline;
  const hasMultipleImages = tl && tl.length > 1;
  const activeImageUrl    = resolveActiveImage(item, currentTimeSec);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none", opacity: exitOpacity }}>
      {item.audioUrl && <Audio src={item.audioUrl} />}

      {/* Arka plan görseli — landscape */}
      {hasMultipleImages ? (
        <>
          {tl!.map((seg, segIdx) => {
            const cfDur  = CROSSFADE_FRAMES / fps;
            const segEnd = seg.startSeconds + seg.durationSeconds;
            if (currentTimeSec < seg.startSeconds - cfDur || currentTimeSec >= segEnd + cfDur) return null;
            const segOp = getSegmentOpacity(currentTimeSec, seg, fps);
            return (
              <Img key={`img-${segIdx}`} src={seg.url} style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                objectFit: "cover", opacity: 0.35 * segOp, filter: "blur(2px)",
              }} />
            );
          })}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)",
          }} />
        </>
      ) : activeImageUrl ? (
        <>
          <Img src={activeImageUrl} style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "cover", opacity: 0.35, filter: "blur(2px)",
          }} />
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)",
          }} />
        </>
      ) : null}

      {/* Metin içerik */}
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
        {/* Aksan çizgisi */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            height: 6, width: `${barScale * 60}%`,
            background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
            borderRadius: 3, boxShadow: `0 0 20px ${accent}88`,
          }} />
        </div>

        {/* Manşet */}
        <h1 style={{
          color: "#F5F5F5", fontSize: 96,
          fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
          letterSpacing: "0.06em", lineHeight: 1.0, margin: 0,
          textShadow: `0 0 60px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.9), 0 0 120px ${accent}33`,
        }}>
          {item.headline}
        </h1>

        {/* Narration */}
        {item.narration && (!item.subtitles || item.subtitles.length === 0) && (
          <p style={{
            color: "rgba(220,220,220,0.9)", fontSize: 40,
            fontFamily: '"Montserrat", Arial, sans-serif', fontWeight: 400,
            marginTop: 16, letterSpacing: "0.04em",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            transform: `translateY(${subY}px)`, opacity: subOpacity,
          }}>
            {item.narration}
          </p>
        )}

        {/* Karaoke altyazı */}
        {item.subtitles && item.subtitles.length > 0 && (
          <div style={{
            marginTop: 28, opacity: subFadeOut,
            fontSize: 32, fontFamily: '"Montserrat", Arial, sans-serif',
            fontWeight: 600, color: "#FFFFFF",
            textShadow: "0 2px 12px rgba(0,0,0,0.95)", lineHeight: 1.5,
          }}>
            {renderSubtitleWords(frame, item.subtitles, accent)}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
