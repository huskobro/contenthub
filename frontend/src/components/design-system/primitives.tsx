/**
 * ContentHub Design System — Shared UI Primitives (Tailwind Migration)
 *
 * Reusable building blocks: PageShell, SectionShell, MetricTile, DataTable,
 * FilterBar, Badge, ActionButton, DetailPanel, EmptyState, etc.
 *
 * All components use Tailwind classes mapped to --ch-* CSS variables.
 * Theme switching works automatically — no JS re-render needed.
 */

import React from "react";
import { cn } from "../../lib/cn";
import { statusStyle } from "./tokens";
import type { StatusVariant } from "./tokens";
import { SkeletonTable, Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

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
    <div className="max-w-page page-enter" data-testid={testId}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-3 text-sm text-neutral-500 flex gap-1 items-center" data-testid="breadcrumb">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-neutral-400">/</span>}
              {item.to ? (
                <a href={item.to} rel="noopener" className="text-brand-600 no-underline">{item.label}</a>
              ) : (
                <span className="text-neutral-700">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-neutral-900 leading-tight font-heading tracking-[-0.02em]" data-testid={testId ? `${testId}-heading` : undefined}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-md text-neutral-600 leading-normal max-w-[640px]" data-testid={testId ? `${testId}-subtitle` : undefined}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex gap-2 shrink-0 items-center">{actions}</div>}
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
      className={cn(
        "bg-surface-card border border-border-subtle rounded-lg mb-5 shadow-sm hover:shadow-md transition-all duration-normal",
        flush ? "p-0" : "p-5"
      )}
      data-testid={testId}
    >
      {(title || description || actions) && (
        <div className={cn(
          "flex justify-between items-start",
          (title || description) && "mb-4",
          flush && "px-5 pt-5"
        )}>
          <div>
            {title && <h3 className="m-0 text-lg font-semibold text-neutral-900 font-heading tracking-[-0.015em]">{title}</h3>}
            {description && <p className="mt-1 text-sm text-neutral-500 leading-normal">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
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
      className="px-5 py-4 border border-border-subtle rounded-lg shadow-sm hover:shadow-md transition-shadow duration-normal min-w-0 bg-surface-card"
      style={accentColor ? { background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor} 2px, var(--ch-surface-card) 2px)` } : undefined}
      data-testid={testId}
    >
      <p className="m-0 text-sm text-neutral-500 font-medium tracking-[0.01em]">{label}</p>
      {loading ? (
        <>
          <Skeleton width="80px" height="24px" rounded="sm" className="mt-2 mb-1" />
          <Skeleton width="100px" height="10px" rounded="sm" />
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-neutral-900 leading-[1.2] tabular-nums font-heading tracking-[-0.02em]" data-testid={testId ? `${testId}-value` : undefined}>
            {value}
          </p>
          {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricGrid — layout wrapper for MetricTile
// ---------------------------------------------------------------------------

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
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
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  const style = statusStyle(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold leading-[1.5] whitespace-nowrap",
        size === "sm" && "px-2 py-1 text-xs",
        size === "md" && "px-3 py-1 text-sm shadow-xs",
        size === "lg" && "px-3 py-2 text-base shadow-xs",
      )}
      style={{ background: style.background, color: style.color }}
    >
      {label ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DataTable — standard table wrapper
// ---------------------------------------------------------------------------

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
  rowTestIdPrefix?: string;
}

export function DataTable<T>({
  columns, data, keyFn, onRowClick, selectedKey, emptyMessage, loading, error, errorMessage, testId, rowTestIdPrefix,
}: DataTableProps<T>) {
  if (loading) {
    return <SkeletonTable columns={columns.length || 5} rows={6} />;
  }
  if (error) {
    return (
      <EmptyState
        illustration="error"
        title="Veri yuklenemedi"
        description={errorMessage || "Veri yuklenirken bir hata olustu. Lutfen tekrar deneyin."}
        testId={testId ? `${testId}-error` : undefined}
      />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        illustration="no-data"
        title={emptyMessage || "Kayit bulunamadi"}
        description="Henuz bu alanda kayit olusturulmamis."
        testId={testId ? `${testId}-empty` : undefined}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" data-testid={testId}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 px-4 text-sm font-semibold text-neutral-600 border-b-2 border-border bg-surface-inset whitespace-nowrap"
                style={{ textAlign: col.align || "left", width: col.width }}
              >
                {col.header}
              </th>
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
                className={cn(
                  "transition-colors duration-fast border-l-[3px]",
                  onRowClick && "cursor-pointer",
                  isSelected
                    ? "bg-brand-100 border-l-brand-500"
                    : "bg-transparent border-l-transparent hover:bg-brand-50",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="py-3 px-4 text-base text-neutral-800 border-b border-border-subtle"
                    style={{ textAlign: col.align || "left" }}
                  >
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
    <div className="flex gap-3 flex-wrap items-center mb-4" data-testid={testId}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input / Select primitives
// ---------------------------------------------------------------------------

export const FilterInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "py-2 px-3 border border-border rounded-md text-base bg-surface-card text-neutral-800 outline-none min-w-[180px]",
          "transition-all duration-fast",
          "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100",
          props.className,
        )}
      />
    );
  }
);
FilterInput.displayName = "FilterInput";

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "py-2 px-3 border border-border rounded-md text-base bg-surface-card text-neutral-800 outline-none",
        "transition-all duration-fast",
        "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100",
        props.className,
      )}
    />
  );
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

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-br from-brand-600 to-brand-700 text-white border-brand-600 hover:from-brand-700 hover:to-brand-800 hover:shadow-sm",
  secondary: "bg-surface-card text-neutral-700 border-border hover:bg-neutral-100 hover:border-border-strong",
  danger: "bg-gradient-to-br from-error to-error-dark text-white border-error hover:from-error-dark hover:to-error-dark hover:shadow-sm",
  ghost: "bg-transparent text-neutral-700 border-transparent hover:bg-neutral-50",
};

export function ActionButton({ variant = "secondary", size = "md", loading, children, className, ...props }: ActionButtonProps) {
  const isDisabled = props.disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md font-medium border leading-[1.5] whitespace-nowrap transition-all duration-fast",
        size === "sm" ? "py-1 px-3 text-sm" : "py-2 px-4 text-base",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        variantClasses[variant],
        className,
      )}
    >
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
    <div className="flex justify-between items-center py-3 px-4 border-t border-border-subtle text-sm text-neutral-600" data-testid={testId}>
      <span className="tabular-nums">
        {offset + 1}\u2013{Math.min(offset + limit, total)} / {total}
      </span>
      <div className="flex gap-2">
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
  return (
    <div
      className={cn(
        "py-3 px-4 mb-4 rounded-md text-base border",
        type === "success" ? "bg-success-light text-success-text border-success/20" : "bg-error-light text-error-text border-error/20",
      )}
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
      className="bg-neutral-950 text-neutral-200 p-4 rounded-md text-sm font-mono overflow-auto leading-normal m-0"
      style={{ maxHeight, borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined }}
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
  buttonTestIdPrefix?: string;
}

export function WindowSelector<T extends string>({ options, value, onChange, testId, buttonTestIdPrefix }: WindowSelectorProps<T>) {
  return (
    <div className="flex gap-1 flex-wrap" data-testid={testId}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            data-testid={buttonTestIdPrefix ? `${buttonTestIdPrefix}${opt.value}` : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              "py-1 px-3 text-sm rounded-md border cursor-pointer transition-all duration-fast",
              active
                ? "font-semibold border-brand-300 bg-brand-50 text-brand-700"
                : "font-normal border-border bg-surface-card text-neutral-700 hover:bg-neutral-50",
            )}
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
    <div className="flex gap-0 border-b-2 border-border mb-5" data-testid={testId}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "py-3 px-4 text-base border-none rounded-t-md border-b-2 -mb-[2px] cursor-pointer transition-all duration-fast",
              isActive
                ? "font-semibold text-brand-700 bg-brand-50 border-b-brand-600"
                : "font-normal text-neutral-600 bg-transparent border-b-transparent hover:bg-neutral-50",
            )}
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
    <code className="text-sm font-mono bg-neutral-100 px-1.5 py-0.5 rounded-sm text-neutral-800">
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
    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-base" data-testid={testId}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span className="text-neutral-500 font-medium">{item.label}</span>
          <span className="text-neutral-800">{item.value}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
