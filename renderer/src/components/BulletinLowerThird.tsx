/**
 * BulletinLowerThird — M31.
 *
 * Haber bulteni lower-third bar component.
 * lower_third_style secimini gorsel bant olarak gosterir.
 *
 * Desteklenen stiller:
 *   broadcast : klasik TV broadcast band (koyu arka plan, beyaz metin, kirmizi aksant)
 *   minimal   : sade, seffaf arka plan, ince cizgi
 *   modern    : gradient arka plan, bold metin
 *
 * Bilinmeyen stil → broadcast varsayilani (boundary fallback).
 */

import React from "react";

export type LowerThirdStyleId = "broadcast" | "minimal" | "modern";

export interface BulletinLowerThirdProps {
  headline: string;
  category?: string;
  itemNumber: number;
  totalItems: number;
  style: LowerThirdStyleId | string | null | undefined;
}

// ---------------------------------------------------------------------------
// Boundary fallback: bilinmeyen stil → broadcast
// ---------------------------------------------------------------------------

function resolveStyle(raw: string | null | undefined): LowerThirdStyleId {
  if (raw === "minimal" || raw === "modern") return raw;
  return "broadcast";
}

// ---------------------------------------------------------------------------
// Broadcast stili — klasik TV band
// ---------------------------------------------------------------------------

function BroadcastBar({
  headline,
  category,
  itemNumber,
  totalItems,
}: Omit<BulletinLowerThirdProps, "style">) {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#0a0f2c",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  const accentStyle: React.CSSProperties = {
    width: 6,
    height: "100%",
    backgroundColor: "#e31414",
    flexShrink: 0,
  };

  const textAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "0 20px",
    overflow: "hidden",
  };

  const headlineStyle: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.2,
    margin: 0,
  };

  const categoryStyle: React.CSSProperties = {
    color: "#aaaaaa",
    fontSize: 14,
    fontFamily: "sans-serif",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  };

  const counterStyle: React.CSSProperties = {
    color: "#888888",
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: "bold",
    padding: "0 20px",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      <div style={accentStyle} />
      <div style={textAreaStyle}>
        <div style={headlineStyle}>{headline}</div>
        {category && <div style={categoryStyle}>{category}</div>}
      </div>
      <div style={counterStyle}>
        {itemNumber} / {totalItems}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal stili — sade, ince cizgi
// ---------------------------------------------------------------------------

function MinimalBar({
  headline,
  category,
  itemNumber,
  totalItems,
}: Omit<BulletinLowerThirdProps, "style">) {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderTop: "2px solid rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    padding: "0 32px",
    overflow: "hidden",
  };

  const textAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
  };

  const headlineStyle: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "600",
    fontFamily: "sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.2,
    margin: 0,
  };

  const categoryStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "sans-serif",
    marginTop: 2,
  };

  const counterStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontFamily: "sans-serif",
    flexShrink: 0,
    whiteSpace: "nowrap",
    marginLeft: 16,
  };

  return (
    <div style={containerStyle}>
      <div style={textAreaStyle}>
        <div style={headlineStyle}>{headline}</div>
        {category && <div style={categoryStyle}>{category}</div>}
      </div>
      <div style={counterStyle}>
        {itemNumber} / {totalItems}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modern stili — gradient, bold metin
// ---------------------------------------------------------------------------

function ModernBar({
  headline,
  category,
  itemNumber,
  totalItems,
}: Omit<BulletinLowerThirdProps, "style">) {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    background: "linear-gradient(90deg, rgba(10,15,44,0.97) 0%, rgba(10,15,44,0.7) 75%, transparent 100%)",
    display: "flex",
    alignItems: "center",
    padding: "0 28px",
    overflow: "hidden",
  };

  const categoryPillStyle: React.CSSProperties = {
    backgroundColor: "#2563eb",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "sans-serif",
    padding: "4px 12px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
    flexShrink: 0,
    marginRight: 18,
    whiteSpace: "nowrap",
  };

  const headlineStyle: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.2,
    flex: 1,
    margin: 0,
  };

  const counterStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "sans-serif",
    flexShrink: 0,
    marginLeft: 16,
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      {category && <div style={categoryPillStyle}>{category}</div>}
      <div style={headlineStyle}>{headline}</div>
      <div style={counterStyle}>
        {itemNumber} / {totalItems}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disari aktarilan ana component
// ---------------------------------------------------------------------------

export const BulletinLowerThird: React.FC<BulletinLowerThirdProps> = (props) => {
  const resolved = resolveStyle(props.style);

  if (resolved === "minimal") {
    return (
      <MinimalBar
        headline={props.headline}
        category={props.category}
        itemNumber={props.itemNumber}
        totalItems={props.totalItems}
      />
    );
  }

  if (resolved === "modern") {
    return (
      <ModernBar
        headline={props.headline}
        category={props.category}
        itemNumber={props.itemNumber}
        totalItems={props.totalItems}
      />
    );
  }

  // Default: broadcast
  return (
    <BroadcastBar
      headline={props.headline}
      category={props.category}
      itemNumber={props.itemNumber}
      totalItems={props.totalItems}
    />
  );
};
