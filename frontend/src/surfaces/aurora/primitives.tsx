/**
 * Aurora primitives — small, zero-dependency wrappers around the CSS classes
 * already defined in `frontend/src/styles/aurora/cockpit.css`.
 *
 * Hiçbir mevcut design-system primitive'i degistirilmez; bunlar sadece
 * aurora surface'i için kullanılır. `[data-surface="aurora"]` scope'u
 * disinda hiçbir efekti yoktur (çünkü class'lar o selector altında tanımlı).
 */

import { forwardRef, useEffect, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
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
}

export function AuroraInspector({ title, onClose, children }: AuroraInspectorProps) {
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
      {children}
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

  return (
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
