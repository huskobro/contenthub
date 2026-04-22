/**
 * Aurora primitives — small, zero-dependency wrappers around the CSS classes
 * already defined in `frontend/src/styles/aurora/cockpit.css`.
 *
 * Hiçbir mevcut design-system primitive'i degistirilmez; bunlar sadece
 * aurora surface'i için kullanılır. `[data-surface="aurora"]` scope'u
 * disinda hiçbir efekti yoktur (çünkü class'lar o selector altında tanımlı).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import type { IconName } from "./icons";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type AuroraButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";
export type AuroraButtonSize = "sm" | "md" | "lg";

export interface AuroraButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuroraButtonVariant;
  size?: AuroraButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const AuroraButton = forwardRef<HTMLButtonElement, AuroraButtonProps>(
  function AuroraButton(
    {
      variant = "secondary",
      size = "md",
      iconLeft,
      iconRight,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "btn",
          variant !== "secondary" && variant,
          size === "sm" && "sm",
          size === "lg" && "lg",
          className,
        )}
        {...rest}
      >
        {iconLeft}
        {children}
        {iconRight}
      </button>
    );
  },
);

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface AuroraCardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: "default" | "tight" | "none";
  interactive?: boolean;
}

export const AuroraCard = forwardRef<HTMLDivElement, AuroraCardProps>(
  function AuroraCard({ pad = "default", className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "card",
          pad === "default" && "card-pad",
          pad === "tight" && "card-tight",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export interface AuroraSectionProps extends HTMLAttributes<HTMLElement> {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function AuroraSection({
  title,
  meta,
  actions,
  className,
  children,
  ...rest
}: AuroraSectionProps) {
  return (
    <section className={cn("section", className)} {...rest}>
      <header className="section-head">
        <div>
          <h3>{title}</h3>
          {meta && <div className="caption">{meta}</div>}
        </div>
        {actions && <div className="hstack">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

export type AuroraStatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface AuroraStatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: AuroraStatusTone;
  pulse?: boolean;
}

export function AuroraStatusChip({
  tone = "neutral",
  pulse = false,
  className,
  children,
  ...rest
}: AuroraStatusChipProps) {
  return (
    <span
      className={cn("chip", tone, pulse && "pulse", className)}
      {...rest}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Meter tile — metric cell for dashboards
// ---------------------------------------------------------------------------

export interface AuroraMeterTileProps {
  label: string;
  value: string | number;
  delta?: { value: string; tone?: "up" | "down" | "flat" };
  spark?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
  onClick?: () => void;
  "data-testid"?: string;
}

export function AuroraMeterTile({
  label,
  value,
  delta,
  spark,
  footer,
  tone = "default",
  loading = false,
  onClick,
  ...rest
}: AuroraMeterTileProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      className={cn(
        "metric",
        tone !== "default" && tone,
        onClick && "metric-interactive",
      )}
      onClick={onClick as (() => void) | undefined}
      data-testid={rest["data-testid"]}
      type={onClick ? "button" : undefined}
    >
      <div className="overline">{label}</div>
      <div className="metric-value mono">
        {loading ? "—" : value}
      </div>
      {delta && (
        <div className={cn("metric-delta", "mono", delta.tone)}>
          {delta.value}
        </div>
      )}
      {spark && <div className="metric-spark">{spark}</div>}
      {footer && <div className="caption metric-foot">{footer}</div>}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Simple data table primitive
// ---------------------------------------------------------------------------

export interface AuroraColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
  width?: string;
  mono?: boolean;
}

export interface AuroraTableProps<T> {
  columns: AuroraColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  empty?: ReactNode;
  loading?: boolean;
  "data-testid"?: string;
}

export function AuroraTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  empty,
  loading = false,
  ...rest
}: AuroraTableProps<T>) {
  if (loading) {
    return (
      <div className="card card-pad aurora-table-skeleton" data-testid={rest["data-testid"]}>
        <div className="caption">Yükleniyor…</div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="card card-pad aurora-table-empty" data-testid={rest["data-testid"]}>
        {empty ?? <span className="caption">Kayıt yok.</span>}
      </div>
    );
  }
  return (
    <div className="card card-tight aurora-table-wrap" data-testid={rest["data-testid"]}>
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? "left",
                  width: c.width,
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey(row, i);
            const selected = selectedKey === key;
            return (
              <tr
                key={key}
                className={cn(
                  onRowClick && "aurora-row-interactive",
                  selected && "selected",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(c.mono && "mono")}
                    style={{ textAlign: c.align ?? "left" }}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageShell — standard page framing for aurora content
// ---------------------------------------------------------------------------

export interface AuroraPageShellProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  "data-testid"?: string;
}

export function AuroraPageShell({
  title,
  breadcrumbs,
  description,
  actions,
  children,
  ...rest
}: AuroraPageShellProps) {
  return (
    <div className="page" data-testid={rest["data-testid"]}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumbs caption" aria-label="Konum">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {b.href ? <a href={b.href}>{b.label}</a> : b.label}
              {i < breadcrumbs.length - 1 && <span className="sep"> / </span>}
            </span>
          ))}
        </nav>
      )}
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {description && <p className="body">{description}</p>}
        </div>
        {actions && <div className="hstack">{actions}</div>}
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spark — compact area+line chart (pure SVG)
// Direct port: ContentHub_Design _System/contenthub/pages/admin/dashboard.html
// ---------------------------------------------------------------------------

export interface AuroraSparkProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
}

export function AuroraSpark({
  data,
  width = 220,
  height = 44,
  color = "var(--accent-primary)",
  area = true,
}: AuroraSparkProps) {
  const safe = (data ?? []).map((v) => (Number.isFinite(v) ? v : 0));
  if (safe.length < 2) {
    return <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }} />;
  }
  const max = Math.max(...safe);
  const min = Math.min(...safe);
  const pad = 2;
  const step = (width - pad * 2) / (safe.length - 1);
  const range = max - min || 1;
  const norm = (v: number) => pad + ((max - v) / range) * (height - pad * 2);
  const pts = safe.map((v, i) => `${pad + i * step},${norm(v)}`).join(" ");
  const lastY = norm(safe[safe.length - 1]);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      {area && (
        <polygon
          fill={color}
          fillOpacity="0.12"
          points={`${pad},${height} ${pts} ${width - pad},${height}`}
        />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      <circle cx={width - pad} cy={lastY} r="2.2" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Donut — multi-segment ring chart (pure SVG)
// ---------------------------------------------------------------------------

export interface AuroraDonutSegment {
  color: string;
  value: number;
  label?: string;
}

export interface AuroraDonutProps {
  segments: AuroraDonutSegment[];
  total: number;
  size?: number;
  strokeWidth?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
}

export function AuroraDonut({
  segments,
  total,
  size = 128,
  strokeWidth = 14,
  centerValue,
  centerLabel,
}: AuroraDonutProps) {
  const r = size / 2 - strokeWidth / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size, position: "relative" }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "100%" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-inset)"
          strokeWidth={strokeWidth}
        />
        {segments.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const len = c * frac;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div
          className="center"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div>
            {centerValue && <div className="v">{centerValue}</div>}
            {centerLabel && <div className="l">{centerLabel}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspector — right-side panel slot content
// ---------------------------------------------------------------------------

export interface AuroraInspectorProps {
  title: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
  /**
   * When provided, the content is rendered as a flex column with the
   * actions footer pinned to the bottom of the inspector (sticky).
   * Use this pattern for pages whose primary CTA would otherwise
   * scroll out of view on long forms (Branding Center, Style Blueprint,
   * Template Create, Automation Center, Settings, …).
   */
  stickyActions?: ReactNode;
}

export function AuroraInspector({
  title,
  onClose,
  children,
  stickyActions,
}: AuroraInspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-head">
        <div className="title">{title}</div>
        {onClose && (
          <button className="close" onClick={onClose} aria-label="Kapat">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      {stickyActions ? (
        <>
          <div className="inspector-body">{children}</div>
          <div className="inspector-actions">{stickyActions}</div>
        </>
      ) : (
        children
      )}
    </aside>
  );
}

export interface AuroraInspectorSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export function AuroraInspectorSection({ title, children }: AuroraInspectorSectionProps) {
  return (
    <div className="inspector-section">
      <div className="inspector-section-title">{title}</div>
      {children}
    </div>
  );
}

export interface AuroraInspectorRowProps {
  label: ReactNode;
  value: ReactNode;
}

export function AuroraInspectorRow({ label, value }: AuroraInspectorRowProps) {
  return (
    <div className="inspector-row">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickLook — 880px modal overlay
// ---------------------------------------------------------------------------

export interface AuroraQuickLookAction {
  label: string;
  onClick: () => void;
  variant?: AuroraButtonVariant;
}

export interface AuroraQuickLookItem {
  title: ReactNode;
  subtitle?: ReactNode;
  thumb?: string;
  preview?: ReactNode;
  meta?: Array<{ k: string; v: ReactNode }>;
  actions?: AuroraQuickLookAction[];
}

export interface AuroraQuickLookProps {
  item: AuroraQuickLookItem | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function AuroraQuickLook({
  item,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: AuroraQuickLookProps) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, hasPrev, hasNext, onPrev, onNext, onClose]);

  if (!item) return null;
  return (
    <div className="quicklook-veil" onClick={onClose}>
      <div className="quicklook" onClick={(e) => e.stopPropagation()}>
        <div className="quicklook-head">
          {item.thumb && (
            <div className="ql-thumb" style={{ backgroundImage: `url(${item.thumb})` }} />
          )}
          <div className="ql-titles">
            <div className="ql-title">{item.title}</div>
            {item.subtitle && <div className="ql-sub">{item.subtitle}</div>}
          </div>
          <div className="ql-nav">
            <button onClick={onPrev} disabled={!hasPrev} title="Önceki (←)">
              <Icon name="chevron-left" size={14} />
            </button>
            <button onClick={onNext} disabled={!hasNext} title="Sonraki (→)">
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
          <button className="ql-close" onClick={onClose} title="Kapat (esc)">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="quicklook-body">
          <div className="ql-preview">{item.preview || "[önizleme yüklenemedi]"}</div>
        </div>
        {item.meta && item.meta.length > 0 && (
          <div className="quicklook-meta">
            {item.meta.map((m, i) => (
              <div key={i} className="meta-cell">
                <span className="k">{m.k}:</span>
                <span className="v">{m.v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="quicklook-foot">
          <div className="kbd-hints">
            <span>
              <span className="kbd">←→</span> gezin
            </span>
            <span>
              <span className="kbd">esc</span> kapat
            </span>
          </div>
          <div className="grow" />
          {item.actions &&
            item.actions.map((a, i) => (
              <AuroraButton
                key={i}
                variant={a.variant || "secondary"}
                size="sm"
                onClick={a.onClick}
              >
                {a.label}
              </AuroraButton>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailDrawer — 520px right slide-in panel
// ---------------------------------------------------------------------------

export interface AuroraDrawerTab {
  id: string;
  label: string;
  children: ReactNode;
}

export interface AuroraDrawerAction {
  label?: string;
  onClick?: () => void;
  variant?: AuroraButtonVariant;
  spacer?: boolean;
}

export interface AuroraDrawerItem {
  breadcrumb?: ReactNode;
  title: ReactNode;
  tabs?: AuroraDrawerTab[];
  children?: ReactNode;
  actions?: AuroraDrawerAction[];
}

export interface AuroraDetailDrawerProps {
  item: AuroraDrawerItem | null;
  onClose: () => void;
  defaultTab?: string;
  expandable?: boolean;
}

export function AuroraDetailDrawer({
  item,
  onClose,
  defaultTab,
  expandable = true,
}: AuroraDetailDrawerProps) {
  const [tab, setTab] = useState<string | undefined>(
    defaultTab || item?.tabs?.[0]?.id,
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  useEffect(() => {
    if (item?.tabs && !tab) setTab(item.tabs[0]?.id);
  }, [item, tab]);

  if (!item) return null;
  const tabContent = item.tabs ? item.tabs.find((t) => t.id === tab) : null;

  // Portaled to document.body so the drawer escapes any page-level stacking
  // context (e.g. `.aurora-dashboard { z-index: 1; position: relative }`),
  // which would otherwise trap the veil + drawer below the cockpit ctxbar
  // (z=10) even though z-drawer=95. Without this, drawer titles rendered near
  // top: 0 are visually swallowed by the topbar. Portalization is the
  // primitive-level fix — every consumer benefits, no page tweaks needed.
  const content = (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className={cn("drawer-detail", expanded && "expanded")}>
        <div className="drawer-head">
          <div className="titles">
            {item.breadcrumb && <div className="crumb">{item.breadcrumb}</div>}
            <div className="title">{item.title}</div>
          </div>
          <div className="actions">
            {expandable && (
              <button
                onClick={() => setExpanded((e) => !e)}
                title={expanded ? "Daralt" : "Genişlet"}
              >
                <Icon name="sliders" size={13} />
              </button>
            )}
            <button onClick={onClose} title="Kapat (esc)">
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
        {item.tabs && (
          <div className="drawer-tabs">
            {item.tabs.map((t) => (
              <button
                key={t.id}
                className={cn("tab", tab === t.id && "active")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="drawer-body">
          {tabContent ? tabContent.children : item.children}
        </div>
        {item.actions && item.actions.length > 0 && (
          <div className="drawer-foot">
            {item.actions.map((a, i) =>
              a.spacer ? (
                <div key={i} className="grow" />
              ) : (
                <AuroraButton
                  key={i}
                  variant={a.variant || "secondary"}
                  size="sm"
                  onClick={a.onClick}
                >
                  {a.label}
                </AuroraButton>
              ),
            )}
          </div>
        )}
      </aside>
    </>
  );

  // SSR guard — skip portalization during server render.
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

// ---------------------------------------------------------------------------
// AuroraConfirmDialog — centered modal for destructive/irreversible actions.
//
// Replaces native `window.confirm` for production flows where we need:
//   - Aurora design tokens (not OS chrome)
//   - explicit danger / warning / neutral tone
//   - busy state for async mutations (disables Confirm while running)
//   - optional body content for context before decision
//
// Not a drawer: confirms are blocking modal decisions, not detail panels.
// Mount at a single parent; call site controls open/onClose/onConfirm.
// ---------------------------------------------------------------------------

export type AuroraConfirmTone = "danger" | "warning" | "neutral";

export interface AuroraConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AuroraConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  "data-testid"?: string;
}

export function AuroraConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "neutral",
  busy = false,
  onConfirm,
  onCancel,
  children,
  ...rest
}: AuroraConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const toneColor =
    tone === "danger"
      ? "var(--state-danger-fg)"
      : tone === "warning"
        ? "var(--state-warning-fg)"
        : "var(--accent-primary)";
  const toneBg =
    tone === "danger"
      ? "var(--state-danger-bg)"
      : tone === "warning"
        ? "var(--state-warning-bg)"
        : "var(--bg-elevated)";
  const toneBorder =
    tone === "danger"
      ? "var(--state-danger-border, var(--state-danger-fg))"
      : tone === "warning"
        ? "var(--state-warning-border, var(--state-warning-fg))"
        : "var(--border-default)";

  const testId = rest["data-testid"];

  // Portaled to document.body for the same stacking-context reason as
  // AuroraDetailDrawer — a page with `.aurora-dashboard { z-index: 1 }`
  // would otherwise cap this dialog's z-index. The dialog already appears
  // correctly today because it centers around 50% viewport, but relying on
  // center geometry instead of stacking correctness is fragile. Portalizing
  // keeps confirm dialogs immune to page-level z-index traps.
  const content = (
    <>
      <div
        className="drawer-veil"
        onClick={() => {
          if (!busy) onCancel();
        }}
        style={{ zIndex: 98 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={testId ? `${testId}-title` : undefined}
        data-testid={testId}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99,
          width: "min(420px, 92vw)",
          background: "var(--bg-surface)",
          border: `1px solid ${toneBorder}`,
          borderRadius: 12,
          boxShadow:
            "0 18px 48px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 18px 10px",
            background: toneBg,
            borderBottom: `1px solid ${toneBorder}`,
          }}
        >
          <div
            id={testId ? `${testId}-title` : undefined}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: toneColor,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            padding: "16px 18px",
            color: "var(--text-primary)",
            fontSize: 13,
            lineHeight: 1.55,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {description && <div>{description}</div>}
          {children}
        </div>
        <div
          style={{
            padding: "10px 14px 14px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid var(--border-default)",
            background: "var(--bg-base, var(--bg-surface))",
          }}
        >
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            data-testid={testId ? `${testId}-cancel` : undefined}
          >
            {cancelLabel}
          </AuroraButton>
          <AuroraButton
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            data-testid={testId ? `${testId}-confirm` : undefined}
          >
            {busy ? "…" : confirmLabel}
          </AuroraButton>
        </div>
      </div>
    </>
  );

  // SSR guard — skip portalization during server render.
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

// ---------------------------------------------------------------------------
// Progress bar — thin horizontal fill
// ---------------------------------------------------------------------------

export interface AuroraProgressBarProps {
  value: number; // 0..100
  done?: boolean;
  className?: string;
}

export function AuroraProgressBar({ value, done, className }: AuroraProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("pbar", done && "done", className)}>
      <div className="fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraField — <label><control><help/error> wrapper
// ---------------------------------------------------------------------------

export interface AuroraFieldProps {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  /** Optional inline action shown on the right of the label row. */
  labelAction?: ReactNode;
}

export function AuroraField({
  label,
  help,
  error,
  children,
  className,
  htmlFor,
  labelAction,
}: AuroraFieldProps) {
  return (
    <div className={cn("field", error != null && error !== false ? "has-error" : null, className)}>
      {(label || labelAction) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {label ? (
            <label className="field-label" htmlFor={htmlFor}>
              {label}
            </label>
          ) : <span />}
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : help ? (
        <div className="field-help">{help}</div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraSegmented — 2..5 option inline enum picker
// ---------------------------------------------------------------------------

export interface AuroraSegmentedOption<V extends string = string> {
  value: V;
  label: ReactNode;
  icon?: IconName;
  disabled?: boolean;
  /** Optional tooltip describing what this option does. */
  hint?: string;
}

export interface AuroraSegmentedProps<V extends string = string> {
  options: AuroraSegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** `true` shows a small dot on the active option. */
  showDot?: boolean;
  "data-testid"?: string;
  className?: string;
}

export function AuroraSegmented<V extends string = string>({
  options,
  value,
  onChange,
  showDot = false,
  className,
  ...rest
}: AuroraSegmentedProps<V>) {
  return (
    <div className={cn("seg", className)} role="radiogroup" data-testid={rest["data-testid"]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.hint}
            className={cn("seg-opt", active && "active")}
            onClick={() => !opt.disabled && onChange(opt.value)}
          >
            {showDot && <span className="seg-opt-dot" aria-hidden="true" />}
            {opt.icon && <Icon name={opt.icon} size={12} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraChipSelect — chip-style selector, single or multi
// ---------------------------------------------------------------------------

export interface AuroraChipOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Optional colour swatch shown before the label. */
  swatch?: string;
  disabled?: boolean;
  hint?: string;
}

export interface AuroraChipSelectProps<V extends string = string> {
  options: AuroraChipOption<V>[];
  value: V | V[] | null;
  onChange: (next: V | V[]) => void;
  multi?: boolean;
  "data-testid"?: string;
  className?: string;
}

export function AuroraChipSelect<V extends string = string>({
  options,
  value,
  onChange,
  multi = false,
  className,
  ...rest
}: AuroraChipSelectProps<V>) {
  const selected = useMemo<Set<V>>(() => {
    if (multi) return new Set(Array.isArray(value) ? value : []);
    return new Set(value ? [value as V] : []);
  }, [value, multi]);

  const toggle = (v: V) => {
    if (multi) {
      const next = new Set(selected);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      onChange(Array.from(next));
    } else {
      onChange(v);
    }
  };

  return (
    <div className={cn("chipselect", className)} data-testid={rest["data-testid"]}>
      {options.map((opt) => {
        const active = selected.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.hint}
            className={cn("chipselect-opt", active && "active")}
            onClick={() => !opt.disabled && toggle(opt.value)}
          >
            {opt.swatch && (
              <span
                className="chipselect-swatch"
                style={{ background: opt.swatch }}
                aria-hidden="true"
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraTagsInput — chip-bound multi-string input
// ---------------------------------------------------------------------------

export interface AuroraTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** Keys that commit the current buffer. Default: Enter, comma. */
  commitOn?: Array<"Enter" | "," | "Tab" | ";">;
  /** Lowercase and dedupe on commit. Default true. */
  dedupe?: boolean;
  /** Optional max number of tags. */
  maxTags?: number;
  /** Normalize the string before commit (e.g. trim, lowercase). */
  normalize?: (raw: string) => string;
  disabled?: boolean;
  "data-testid"?: string;
  className?: string;
}

export function AuroraTagsInput({
  value,
  onChange,
  placeholder,
  commitOn = ["Enter", ","],
  dedupe = true,
  maxTags,
  normalize,
  disabled = false,
  className,
  ...rest
}: AuroraTagsInputProps) {
  const [buffer, setBuffer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (raw: string) => {
      const cleaned = (normalize ? normalize(raw) : raw.trim());
      if (!cleaned) return;
      if (dedupe && value.includes(cleaned)) {
        setBuffer("");
        return;
      }
      if (maxTags && value.length >= maxTags) {
        setBuffer("");
        return;
      }
      onChange([...value, cleaned]);
      setBuffer("");
    },
    [value, onChange, normalize, dedupe, maxTags],
  );

  const removeAt = (i: number) => {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (commitOn.includes(e.key as "Enter" | "," | "Tab" | ";")) {
      if (buffer.trim().length > 0) {
        e.preventDefault();
        commit(buffer);
      }
    } else if (e.key === "Backspace" && buffer === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",") && !text.includes("\n")) return;
    e.preventDefault();
    const parts = text
      .split(/[,\n]/)
      .map((p) => (normalize ? normalize(p) : p.trim()))
      .filter(Boolean);
    const next = dedupe
      ? Array.from(new Set([...value, ...parts]))
      : [...value, ...parts];
    onChange(maxTags ? next.slice(0, maxTags) : next);
  };

  return (
    <div
      className={cn("tagsinput", className)}
      data-testid={rest["data-testid"]}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span className="tagsinput-tag" key={`${tag}-${i}`}>
          <span>{tag}</span>
          <button
            type="button"
            className="tagsinput-tag-x"
            aria-label={`${tag} kaldır`}
            onClick={(e) => {
              e.stopPropagation();
              removeAt(i);
            }}
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tagsinput-input"
        placeholder={value.length === 0 ? placeholder : ""}
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => buffer.trim() && commit(buffer)}
        onPaste={onPaste}
        disabled={disabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraSlider — labelled numeric slider
// ---------------------------------------------------------------------------

export interface AuroraSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Formatter for the tail-end readout. Default: identity. */
  formatValue?: (v: number) => string;
}

export function AuroraSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  className,
  ...rest
}: AuroraSliderProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };
  return (
    <div className={cn("slider", className)}>
      <input
        type="range"
        className="slider-input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handle}
        {...rest}
      />
      <span className="slider-value">
        {formatValue ? formatValue(value) : value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraAssetPathInput — URL/path input with validator + optional picker
// ---------------------------------------------------------------------------

export type AuroraAssetPathMode = "url" | "path" | "any";

export interface AuroraAssetPathInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  mode?: AuroraAssetPathMode;
  /** If provided, renders a "Browse" button which calls onBrowse(). */
  onBrowse?: () => void;
  disabled?: boolean;
  "data-testid"?: string;
  className?: string;
}

function classifyValue(value: string, mode: AuroraAssetPathMode): {
  tone: "ok" | "warn" | "err" | "mute";
  label: string;
} {
  const v = value.trim();
  if (!v) return { tone: "mute", label: "" };
  if (mode === "url" || mode === "any") {
    try {
      const u = new URL(v);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { tone: "ok", label: "URL" };
      }
      return { tone: "warn", label: u.protocol };
    } catch {
      if (mode === "url") return { tone: "err", label: "geçersiz URL" };
    }
  }
  if (mode === "path" || mode === "any") {
    if (v.startsWith("/") || v.startsWith("./") || v.startsWith("../") || /^[a-zA-Z]:[\\/]/.test(v)) {
      return { tone: "ok", label: "yol" };
    }
    if (mode === "path") return { tone: "warn", label: "göreli" };
  }
  return { tone: "warn", label: "?" };
}

export function AuroraAssetPathInput({
  value,
  onChange,
  placeholder,
  mode = "any",
  onBrowse,
  disabled,
  className,
  ...rest
}: AuroraAssetPathInputProps) {
  const info = classifyValue(value, mode);
  return (
    <div className={cn("assetpath", className)} data-testid={rest["data-testid"]}>
      <input
        className="assetpath-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
      />
      {info.label && (
        <span className={cn("assetpath-status", info.tone)} title={info.label}>
          ● {info.label}
        </span>
      )}
      {onBrowse && (
        <button
          type="button"
          className="assetpath-btn"
          onClick={onBrowse}
          disabled={disabled}
        >
          <Icon name="folder" size={11} />
          <span>Gözat</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuroraStructuredJsonEditor — key/value editor with a Raw-JSON fallback
// ---------------------------------------------------------------------------

export type AuroraStructuredKind = "object" | "array";

type KVRow = { key: string; value: string };

export interface AuroraStructuredJsonEditorProps {
  /** The parsed JSON value. null/undefined === empty. */
  value: unknown;
  onChange: (next: unknown) => void;
  /** Expected top-level kind. Default "object". */
  kind?: AuroraStructuredKind;
  /** Extra row presets (common fields) shown as quick-add buttons. */
  presetKeys?: string[];
  /** Optional title banner inside the editor. */
  title?: ReactNode;
  /** Help copy. */
  help?: ReactNode;
  disabled?: boolean;
  "data-testid"?: string;
  className?: string;
}

function objectToRows(obj: unknown): KVRow[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>).map(([k, v]) => ({
    key: k,
    value: typeof v === "string" ? v : JSON.stringify(v),
  }));
}

function rowsToObject(rows: KVRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k) continue;
    const raw = r.value.trim();
    // Heuristic: if it looks like JSON (number/true/false/[{"...}]/null), parse.
    if (raw === "") {
      out[k] = "";
    } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
      out[k] = Number(raw);
    } else if (raw === "true" || raw === "false") {
      out[k] = raw === "true";
    } else if (raw === "null") {
      out[k] = null;
    } else if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
      try {
        out[k] = JSON.parse(raw);
      } catch {
        out[k] = raw;
      }
    } else {
      out[k] = raw;
    }
  }
  return out;
}

function arrayToRows(arr: unknown): KVRow[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((v, i) => ({
    key: String(i),
    value: typeof v === "string" ? v : JSON.stringify(v),
  }));
}

function rowsToArray(rows: KVRow[]): unknown[] {
  return rows.map((r) => {
    const raw = r.value.trim();
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if (raw === "true" || raw === "false") return raw === "true";
    if (raw === "null") return null;
    if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  });
}

export function AuroraStructuredJsonEditor({
  value,
  onChange,
  kind = "object",
  presetKeys,
  title,
  help,
  disabled,
  className,
  ...rest
}: AuroraStructuredJsonEditorProps) {
  const [tab, setTab] = useState<"form" | "raw">("form");
  const [rows, setRows] = useState<KVRow[]>(() =>
    kind === "array" ? arrayToRows(value) : objectToRows(value),
  );
  const [raw, setRaw] = useState<string>(() =>
    value == null ? "" : JSON.stringify(value, null, 2),
  );
  const [rawError, setRawError] = useState<string | null>(null);

  // Propagate external changes of `value` back into rows/raw only when the
  // source of truth changes externally (initial mount + reset). Avoid
  // overwriting keystrokes on every keystroke-triggered onChange.
  const valueSig = useMemo(() => {
    try { return JSON.stringify(value); } catch { return ""; }
  }, [value]);
  const lastValueSigRef = useRef(valueSig);
  useEffect(() => {
    if (valueSig === lastValueSigRef.current) return;
    lastValueSigRef.current = valueSig;
    setRows(kind === "array" ? arrayToRows(value) : objectToRows(value));
    setRaw(value == null ? "" : JSON.stringify(value, null, 2));
    setRawError(null);
  }, [valueSig, kind, value]);

  const commitRows = (next: KVRow[]) => {
    setRows(next);
    const out = kind === "array" ? rowsToArray(next) : rowsToObject(next);
    onChange(out);
  };

  const addRow = (presetKey?: string) => {
    commitRows([...rows, { key: presetKey ?? "", value: "" }]);
  };

  const updateRow = (i: number, patch: Partial<KVRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    commitRows(next);
  };

  const removeRow = (i: number) => {
    const next = rows.slice();
    next.splice(i, 1);
    commitRows(next);
  };

  const handleRaw = (text: string) => {
    setRaw(text);
    if (text.trim() === "") {
      setRawError(null);
      onChange(kind === "array" ? [] : {});
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setRawError(null);
      onChange(parsed);
      // Keep the form view in sync.
      setRows(kind === "array" ? arrayToRows(parsed) : objectToRows(parsed));
    } catch (err) {
      setRawError((err as Error).message);
    }
  };

  const id = useId();

  return (
    <div className={cn("structured", className)} data-testid={rest["data-testid"]}>
      <div className="structured-tabs">
        <button
          type="button"
          className={cn("structured-tab", tab === "form" && "active")}
          onClick={() => setTab("form")}
        >
          Form
        </button>
        <button
          type="button"
          className={cn("structured-tab", tab === "raw" && "active")}
          onClick={() => setTab("raw")}
        >
          Raw JSON
        </button>
        {title && (
          <span className="structured-tab advanced" aria-hidden="true">
            {title}
          </span>
        )}
      </div>

      <div className="structured-body">
        {tab === "form" ? (
          <>
            {help && <div className="field-help">{help}</div>}
            {rows.length === 0 && (
              <div className="field-help" style={{ fontStyle: "italic" }}>
                Henüz alan yok. {kind === "array" ? "Öğe" : "Anahtar"} ekleyin.
              </div>
            )}
            {rows.map((row, i) => (
              <div className="structured-row" key={`${id}-${i}`}>
                <input
                  className="input mono"
                  value={row.key}
                  onChange={(e) => updateRow(i, { key: e.target.value })}
                  placeholder={kind === "array" ? "index" : "anahtar"}
                  disabled={disabled || kind === "array"}
                />
                <input
                  className="input"
                  value={row.value}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  placeholder="değer"
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeRow(i)}
                  disabled={disabled}
                  aria-label="Satırı sil"
                  title="Satırı sil"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="structured-add"
                onClick={() => addRow()}
                disabled={disabled}
              >
                + {kind === "array" ? "Öğe" : "Alan"} ekle
              </button>
              {presetKeys?.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="structured-add"
                  onClick={() => addRow(k)}
                  disabled={disabled || rows.some((r) => r.key === k)}
                >
                  + {k}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {help && <div className="field-help">{help}</div>}
            <textarea
              className="input mono"
              value={raw}
              onChange={(e) => handleRaw(e.target.value)}
              placeholder={kind === "array" ? "[]" : "{}"}
              rows={10}
              disabled={disabled}
              spellCheck={false}
            />
            {rawError && (
              <div className="field-error" role="alert">
                JSON hatası: {rawError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspector — extended to support sticky actions footer
// ---------------------------------------------------------------------------
//
// Usage:
//   <AuroraInspector title="Seçim" stickyActions={
//     <>
//       <AuroraButton variant="primary" onClick={save}>Kaydet</AuroraButton>
//       <AuroraButton variant="ghost" onClick={reset}>Vazgeç</AuroraButton>
//     </>
//   }>
//     ...section content that can grow freely...
//   </AuroraInspector>
//
// The inspector body scrolls independently; the actions footer stays pinned.
// This is what lets Branding Center, Style Blueprint Create, Template Create,
// etc. keep the Save CTA reachable no matter how long the form becomes.

export interface AuroraInspectorExtraProps {
  stickyActions?: ReactNode;
}

export const AuroraInspectorActions: React.FC<{ children: ReactNode }> = ({
  children,
}) => <div className="inspector-actions">{children}</div>;
