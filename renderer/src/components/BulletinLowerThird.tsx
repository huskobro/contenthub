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
  /** M41: Haberin yayın tarihi (ISO string) */
  publishedAt?: string | null;
  /** M41: Kaynak adı */
  sourceName?: string | null;
  /** M41: Tarih göster */
  showDate?: boolean;
  /** M41: Kaynak göster */
  showSource?: boolean;
  /** M41a: Portrait layout */
  isPortrait?: boolean;
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

/** M41: Tarih formatla (ISO → kısa tarih) */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** M41a: Ticker yüksekliği — lower-third bunun üzerine konumlanır */
const TICKER_H_LANDSCAPE = 64;
const TICKER_H_PORTRAIT = 48;

function BroadcastBar({
  headline,
  category,
  itemNumber,
  totalItems,
  publishedAt,
  sourceName,
  showDate = true,
  showSource = false,
  isPortrait = false,
}: Omit<BulletinLowerThirdProps, "style">) {
  const tickerH = isPortrait ? TICKER_H_PORTRAIT : TICKER_H_LANDSCAPE;
  const barH = isPortrait ? 60 : 80;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: tickerH,
    left: 0,
    right: 0,
    height: barH,
    backgroundColor: "#0a0f2c",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  const accentStyle: React.CSSProperties = {
    width: isPortrait ? 4 : 6,
    height: "100%",
    backgroundColor: "#e31414",
    flexShrink: 0,
  };

  const textAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: isPortrait ? "0 12px" : "0 20px",
    overflow: "hidden",
  };

  const headlineStyle: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: isPortrait ? 20 : 28,
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
    fontSize: isPortrait ? 11 : 14,
    fontFamily: "sans-serif",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  };

  const counterStyle: React.CSSProperties = {
    color: "#888888",
    fontSize: isPortrait ? 11 : 14,
    fontFamily: "sans-serif",
    fontWeight: "bold",
    padding: isPortrait ? "0 12px" : "0 20px",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      <div style={accentStyle} />
      <div style={textAreaStyle}>
        <div style={headlineStyle}>{headline}</div>
        <div style={categoryStyle}>
          {category && <span>{category}</span>}
          {/* M41: Tarih ve kaynak bilgisi */}
          {showDate && publishedAt && (
            <span>{category ? " · " : ""}{formatDate(publishedAt)}</span>
          )}
          {showSource && sourceName && (
            <span>{(category || (showDate && publishedAt)) ? " · " : ""}{sourceName}</span>
          )}
        </div>
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
  isPortrait = false,
}: Omit<BulletinLowerThirdProps, "style">) {
  const tickerH = isPortrait ? TICKER_H_PORTRAIT : TICKER_H_LANDSCAPE;
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: tickerH,
    left: 0,
    right: 0,
    height: isPortrait ? 60 : 80,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderTop: "2px solid rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    padding: isPortrait ? "0 16px" : "0 32px",
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
    fontSize: isPortrait ? 18 : 26,
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
    fontSize: isPortrait ? 10 : 13,
    fontFamily: "sans-serif",
    marginTop: 2,
  };

  const counterStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
    fontSize: isPortrait ? 10 : 13,
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
  isPortrait = false,
}: Omit<BulletinLowerThirdProps, "style">) {
  const tickerH = isPortrait ? TICKER_H_PORTRAIT : TICKER_H_LANDSCAPE;
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: tickerH,
    left: 0,
    right: 0,
    height: isPortrait ? 60 : 80,
    background: "linear-gradient(90deg, rgba(10,15,44,0.97) 0%, rgba(10,15,44,0.7) 75%, transparent 100%)",
    display: "flex",
    alignItems: "center",
    padding: isPortrait ? "0 16px" : "0 28px",
    overflow: "hidden",
  };

  const categoryPillStyle: React.CSSProperties = {
    backgroundColor: "#2563eb",
    color: "#FFFFFF",
    fontSize: isPortrait ? 10 : 13,
    fontWeight: "700",
    fontFamily: "sans-serif",
    padding: isPortrait ? "3px 8px" : "4px 12px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
    flexShrink: 0,
    marginRight: isPortrait ? 10 : 18,
    whiteSpace: "nowrap",
  };

  const headlineStyle: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: isPortrait ? 20 : 30,
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
    fontSize: isPortrait ? 11 : 14,
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
        isPortrait={props.isPortrait}
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
        isPortrait={props.isPortrait}
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
      publishedAt={props.publishedAt}
      sourceName={props.sourceName}
      showDate={props.showDate}
      showSource={props.showSource}
      isPortrait={props.isPortrait}
    />
  );
};
