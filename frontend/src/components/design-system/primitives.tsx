/**
 * ContentHub Design System — Shared UI Primitives (M24)
 *
 * Reusable building blocks: PageShell, SectionShell, MetricTile, DataTable,
 * FilterBar, Badge, ActionButton, DetailPanel, EmptyState, etc.
 *
 * All components use tokens.ts — zero inline ad-hoc values.
 */

import React from "react";
import { colors, typography, spacing, radius, shadow, transition, statusStyle } from "./tokens";
import type { StatusVariant } from "./tokens";

// ---------------------------------------------------------------------------
// PageShell — wraps every admin page
// ---------------------------------------------------------------------------

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}

export function PageShell({ title, subtitle, breadcrumb, actions, children, testId }: PageShellProps) {
  return (
    <div style={{ maxWidth: "1280px" }} data-testid={testId}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav style={{ marginBottom: spacing[3], fontSize: typography.size.sm, color: colors.neutral[500], display: "flex", gap: spacing[1], alignItems: "center" }} data-testid="breadcrumb">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: colors.neutral[400] }}>/</span>}
              {item.to ? (
                <a href={item.to} rel="noopener" style={{ color: colors.brand[600], textDecoration: "none" }}>{item.label}</a>
              ) : (
                <span style={{ color: colors.neutral[700] }}>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing[6], gap: spacing[4] }}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900], lineHeight: typography.lineHeight.tight }} data-testid={testId ? `${testId}-heading` : undefined}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: `${spacing[2]} 0 0`, fontSize: typography.size.md, color: colors.neutral[600], lineHeight: typography.lineHeight.normal, maxWidth: "640px" }} data-testid={testId ? `${testId}-subtitle` : undefined}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ display: "flex", gap: spacing[2], flexShrink: 0, alignItems: "center" }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionShell — generic content section with optional header
// ---------------------------------------------------------------------------

interface SectionShellProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  flush?: boolean;
}

export function SectionShell({ title, description, actions, children, testId, flush }: SectionShellProps) {
  return (
    <section
      style={{
        background: colors.surface.card,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
        padding: flush ? 0 : spacing[5],
        marginBottom: spacing[5],
        boxShadow: shadow.xs,
      }}
      data-testid={testId}
    >
      {(title || description || actions) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: (title || description) ? spacing[4] : 0, padding: flush ? `${spacing[5]} ${spacing[5]} 0` : 0 }}>
          <div>
            {title && <h3 style={{ margin: 0, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>{title}</h3>}
            {description && <p style={{ margin: `${spacing[1]} 0 0`, fontSize: typography.size.sm, color: colors.neutral[500], lineHeight: typography.lineHeight.normal }}>{description}</p>}
          </div>
          {actions && <div style={{ display: "flex", gap: spacing[2] }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// MetricTile — numeric KPI display
// ---------------------------------------------------------------------------

interface MetricTileProps {
  label: string;
  value: string | number;
  note?: string;
  loading?: boolean;
  testId?: string;
  accentColor?: string;
}

export function MetricTile({ label, value, note, loading, testId, accentColor }: MetricTileProps) {
  return (
    <div
      style={{
        padding: `${spacing[4]} ${spacing[5]}`,
        background: colors.surface.card,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        boxShadow: shadow.xs,
        minWidth: 0,
      }}
      data-testid={testId}
    >
      <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[500], fontWeight: typography.weight.medium, letterSpacing: "0.01em" }}>
        {label}
      </p>
      <p style={{ margin: `${spacing[1]} 0 0`, fontSize: "1.5rem", fontWeight: typography.weight.bold, color: colors.neutral[900], lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }} data-testid={testId ? `${testId}-value` : undefined}>
        {loading ? "\u2026" : value}
      </p>
      {note && (
        <p style={{ margin: `${spacing[1]} 0 0`, fontSize: typography.size.xs, color: colors.neutral[500] }}>
          {note}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricGrid — layout wrapper for MetricTile
// ---------------------------------------------------------------------------

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: spacing[4] }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge — universal badge for all statuses
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  const style = statusStyle(status);
  const isSmall = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: isSmall ? "0.125rem 0.5rem" : "0.25rem 0.625rem",
        borderRadius: radius.full,
        fontSize: isSmall ? typography.size.xs : typography.size.sm,
        fontWeight: typography.weight.semibold,
        background: style.background,
        color: style.color,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {label ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DataTable — standard table wrapper
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: `${spacing[3]} ${spacing[4]}`,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[600],
  borderBottom: `2px solid ${colors.border.default}`,
  background: colors.neutral[25],
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: `${spacing[3]} ${spacing[4]}`,
  fontSize: typography.size.base,
  color: colors.neutral[800],
  borderBottom: `1px solid ${colors.border.subtle}`,
};

interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedKey?: string | null;
  emptyMessage?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  testId?: string;
  /** If provided, each <tr> gets data-testid=`${rowTestIdPrefix}-${keyFn(item)}` */
  rowTestIdPrefix?: string;
}

export function DataTable<T>({
  columns, data, keyFn, onRowClick, selectedKey, emptyMessage, loading, error, errorMessage, testId, rowTestIdPrefix,
}: DataTableProps<T>) {
  if (loading) {
    return <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yukleniyor...</p>;
  }
  if (error) {
    return <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>{errorMessage || "Veri yuklenirken hata olustu."}</p>;
  }
  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }} data-testid={testId ? `${testId}-empty` : undefined}>
        <p style={{ margin: 0, fontSize: typography.size.md }}>{emptyMessage || "Kayit bulunamadi."}</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid={testId}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...thStyle, textAlign: col.align || "left", width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const key = keyFn(item);
            const isSelected = selectedKey === key;
            return (
              <tr
                key={key}
                data-testid={rowTestIdPrefix ? `${rowTestIdPrefix}-${key}` : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                style={{
                  cursor: onRowClick ? "pointer" : "default",
                  background: isSelected ? colors.brand[50] : "transparent",
                  transition: `background ${transition.fast}`,
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget.style.background = colors.neutral[50]); }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget.style.background = "transparent"); }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ ...tdStyle, textAlign: col.align || "left" }}>
                    {col.render(item)}
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
// FilterBar — standard filter container
// ---------------------------------------------------------------------------

interface FilterBarProps {
  children: React.ReactNode;
  testId?: string;
}

export function FilterBar({ children, testId }: FilterBarProps) {
  return (
    <div style={{ display: "flex", gap: spacing[3], flexWrap: "wrap", alignItems: "center", marginBottom: spacing[4] }} data-testid={testId}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input / Select primitives
// ---------------------------------------------------------------------------

const inputBase: React.CSSProperties = {
  padding: `${spacing[2]} ${spacing[3]}`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.md,
  fontSize: typography.size.base,
  background: colors.surface.card,
  color: colors.neutral[800],
  outline: "none",
  transition: `border-color ${transition.fast}`,
};

export const FilterInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    return <input ref={ref} {...props} style={{ ...inputBase, minWidth: "180px", ...props.style }} />;
  }
);
FilterInput.displayName = "FilterInput";

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputBase, ...props.style }} />;
}

// ---------------------------------------------------------------------------
// ActionButton — consistent buttons
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
}

function btnStyles(variant: ButtonVariant, size: "sm" | "md", disabled?: boolean): React.CSSProperties {
  const isSmall = size === "sm";
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    padding: isSmall ? `${spacing[1]} ${spacing[3]}` : `${spacing[2]} ${spacing[4]}`,
    fontSize: isSmall ? typography.size.sm : typography.size.base,
    fontWeight: typography.weight.medium,
    borderRadius: radius.md,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: `all ${transition.fast}`,
    border: "1px solid transparent",
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  };

  switch (variant) {
    case "primary":
      return { ...base, background: colors.brand[600], color: "#fff", borderColor: colors.brand[600] };
    case "danger":
      return { ...base, background: colors.error.light, color: colors.error.dark, borderColor: colors.error.light };
    case "ghost":
      return { ...base, background: "transparent", color: colors.neutral[700], borderColor: "transparent" };
    case "secondary":
    default:
      return { ...base, background: colors.surface.card, color: colors.neutral[700], borderColor: colors.border.default };
  }
}

export function ActionButton({ variant = "secondary", size = "md", loading, children, ...props }: ActionButtonProps) {
  return (
    <button {...props} disabled={props.disabled || loading} style={{ ...btnStyles(variant, size, props.disabled || loading), ...props.style }}>
      {loading ? "..." : children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  testId?: string;
}

export function Pagination({ offset, limit, total, onPrev, onNext, testId }: PaginationProps) {
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;
  if (total <= limit) return null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${spacing[3]} ${spacing[4]}`, borderTop: `1px solid ${colors.border.subtle}`, fontSize: typography.size.sm, color: colors.neutral[600] }} data-testid={testId}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {offset + 1}\u2013{Math.min(offset + limit, total)} / {total}
      </span>
      <div style={{ display: "flex", gap: spacing[2] }}>
        <ActionButton size="sm" disabled={!hasPrev} onClick={onPrev}>Onceki</ActionButton>
        <ActionButton size="sm" disabled={!hasNext} onClick={onNext}>Sonraki</ActionButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedbackBanner — success/error notifications
// ---------------------------------------------------------------------------

interface FeedbackBannerProps {
  type: "success" | "error";
  message: string;
  testId?: string;
}

export function FeedbackBanner({ type, message, testId }: FeedbackBannerProps) {
  const isSuccess = type === "success";
  return (
    <div
      style={{
        padding: `${spacing[3]} ${spacing[4]}`,
        marginBottom: spacing[4],
        borderRadius: radius.md,
        fontSize: typography.size.base,
        background: isSuccess ? colors.success.light : colors.error.light,
        color: isSuccess ? colors.success.text : colors.error.text,
        border: `1px solid ${isSuccess ? colors.success.base : colors.error.base}20`,
      }}
      data-testid={testId}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CodeBlock — formatted JSON / code viewer
// ---------------------------------------------------------------------------

interface CodeBlockProps {
  content: string;
  maxHeight?: string;
  accentBorder?: string;
  testId?: string;
}

export function CodeBlock({ content, maxHeight = "300px", accentBorder, testId }: CodeBlockProps) {
  return (
    <pre
      style={{
        background: colors.neutral[950],
        color: colors.neutral[200],
        padding: spacing[4],
        borderRadius: radius.md,
        fontSize: typography.size.sm,
        fontFamily: typography.monoFamily,
        overflow: "auto",
        maxHeight,
        lineHeight: typography.lineHeight.normal,
        borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
        margin: 0,
      }}
      data-testid={testId}
    >
      {content}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// WindowSelector — time window picker (analytics)
// ---------------------------------------------------------------------------

interface WindowOption<T extends string> {
  value: T;
  label: string;
}

interface WindowSelectorProps<T extends string> {
  options: WindowOption<T>[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
  /** If provided, each button gets data-testid=`${buttonTestIdPrefix}${opt.value}` */
  buttonTestIdPrefix?: string;
}

export function WindowSelector<T extends string>({ options, value, onChange, testId, buttonTestIdPrefix }: WindowSelectorProps<T>) {
  return (
    <div style={{ display: "flex", gap: spacing[1], flexWrap: "wrap" }} data-testid={testId}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            data-testid={buttonTestIdPrefix ? `${buttonTestIdPrefix}${opt.value}` : undefined}
            onClick={() => onChange(opt.value)}
            style={{
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.size.sm,
              fontWeight: active ? typography.weight.semibold : typography.weight.normal,
              borderRadius: radius.md,
              border: `1px solid ${active ? colors.brand[300] : colors.border.default}`,
              background: active ? colors.brand[50] : colors.surface.card,
              color: active ? colors.brand[700] : colors.neutral[700],
              cursor: "pointer",
              transition: `all ${transition.fast}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TabBar — reusable tab component
// ---------------------------------------------------------------------------

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (key: T) => void;
  testId?: string;
}

export function TabBar<T extends string>({ tabs, active, onChange, testId }: TabBarProps<T>) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${colors.border.default}`, marginBottom: spacing[5] }} data-testid={testId}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              fontSize: typography.size.base,
              fontWeight: isActive ? typography.weight.semibold : typography.weight.normal,
              color: isActive ? colors.brand[700] : colors.neutral[600],
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${isActive ? colors.brand[600] : "transparent"}`,
              marginBottom: "-2px",
              cursor: "pointer",
              transition: `color ${transition.fast}, border-color ${transition.fast}`,
            }}
            data-testid={`${testId}-${tab.key}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mono — inline code / id display
// ---------------------------------------------------------------------------

export function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontSize: typography.size.sm, fontFamily: typography.monoFamily, background: colors.neutral[100], padding: "0.1rem 0.35rem", borderRadius: radius.sm, color: colors.neutral[800] }}>
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// DetailGrid — key-value display
// ---------------------------------------------------------------------------

interface DetailGridProps {
  items: { label: string; value: React.ReactNode }[];
  testId?: string;
}

export function DetailGrid({ items, testId }: DetailGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: `${spacing[2]} ${spacing[3]}`, fontSize: typography.size.base }} data-testid={testId}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: colors.neutral[500], fontWeight: typography.weight.medium }}>{item.label}</span>
          <span style={{ color: colors.neutral[800] }}>{item.value}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
