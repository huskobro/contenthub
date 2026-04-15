/**
 * Shared chrome elements + helpers for product_review scenes.
 * - SceneFrame: consistent padding / safe area + entrance animation
 * - priceFormatter: TR/EN number formatting
 */

import React, { PropsWithChildren } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION, ProductReviewPalette, TYPOGRAPHY } from "./palette";
import type { ProductReviewOrientation } from "./types";

export interface SceneFrameProps {
  palette: ProductReviewPalette;
  orientation: ProductReviewOrientation;
  sceneDurationFrames: number;
  background?: "gradient" | "solid" | "mesh";
  watermark?: string | null;
  priceDisclaimer?: string | null;
}

/** Common entrance: soft fade + spring scale. */
export function useSceneEnterProgress(): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame,
    fps,
    config: { damping: MOTION.enterDamping, mass: MOTION.enterMass },
    durationInFrames: MOTION.sceneEnterFrames * 2,
  });
}

/** Common exit fade (last N frames). */
export function useSceneExitOpacity(sceneDurationFrames: number): number {
  const frame = useCurrentFrame();
  const exitStart = Math.max(0, sceneDurationFrames - MOTION.sceneExitFrames);
  return interpolate(frame, [exitStart, sceneDurationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function SceneFrame({
  palette,
  orientation,
  background = "gradient",
  watermark,
  priceDisclaimer,
  sceneDurationFrames,
  children,
}: PropsWithChildren<SceneFrameProps>): JSX.Element {
  const exitOpacity = useSceneExitOpacity(sceneDurationFrames);

  const bgStyle: React.CSSProperties =
    background === "gradient"
      ? {
          background: `radial-gradient(60% 60% at 50% 30%, ${palette.bgAlt} 0%, ${palette.bg} 100%)`,
        }
      : background === "mesh"
      ? {
          background: `
            radial-gradient(30% 30% at 20% 20%, ${palette.accentSoft} 0%, transparent 60%),
            radial-gradient(30% 30% at 80% 80%, ${palette.accentSoft} 0%, transparent 60%),
            linear-gradient(180deg, ${palette.bgAlt} 0%, ${palette.bg} 100%)
          `,
        }
      : { backgroundColor: palette.bg };

  const isVertical = orientation === "vertical";
  const safePad = isVertical ? "5%" : "6%";

  return (
    <AbsoluteFill style={{ ...bgStyle, opacity: exitOpacity }}>
      {/* Film grain + vignette */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          padding: safePad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          color: palette.textPrimary,
          fontFamily: TYPOGRAPHY.body,
        }}
      >
        {children}
      </AbsoluteFill>
      {watermark && (
        <div
          style={{
            position: "absolute",
            bottom: isVertical ? 24 : 18,
            right: isVertical ? 24 : 24,
            fontSize: isVertical ? 18 : 14,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: palette.textSecondary,
            opacity: 0.6,
            fontFamily: TYPOGRAPHY.mono,
          }}
        >
          {watermark}
        </div>
      )}
      {priceDisclaimer && (
        <div
          style={{
            position: "absolute",
            left: isVertical ? 24 : 40,
            bottom: isVertical ? 48 : 24,
            right: isVertical ? 24 : "45%",
            fontSize: isVertical ? 16 : 14,
            lineHeight: 1.35,
            color: palette.textSecondary,
            opacity: 0.75,
            fontStyle: "italic",
          }}
        >
          * {priceDisclaimer}
        </div>
      )}
    </AbsoluteFill>
  );
}

export function formatPrice(
  price: number | null | undefined,
  currency: string | null | undefined,
  lang: "tr" | "en",
): string {
  if (price === null || price === undefined || Number.isNaN(price)) return "—";
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const cur = (currency || "").toUpperCase();
  try {
    if (cur) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 2,
      }).format(price);
    }
  } catch {
    // fall through — currency may be invalid ISO code
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(price);
}

export function kFormat(n: number | null | undefined, lang: "tr" | "en"): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString(locale);
}
