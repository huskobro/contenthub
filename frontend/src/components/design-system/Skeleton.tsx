/**
 * Skeleton — Loading placeholder components
 *
 * Shimmer-animated placeholder blocks shown while data loads.
 * Includes variants for: text lines, cards, tables, metrics, and custom shapes.
 * All variants respect the active theme's colors via CSS variables.
 */

import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Base Skeleton — animated shimmer block
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
  /** Width — CSS value or Tailwind class */
  width?: string;
  /** Height — CSS value or Tailwind class */
  height?: string;
  /** Border radius override */
  rounded?: "sm" | "md" | "lg" | "full" | "none";
  testId?: string;
}

const roundedMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({ className, width, height, rounded = "md", testId }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer bg-neutral-200/60",
        roundedMap[rounded],
        className,
      )}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      data-testid={testId}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// SkeletonText — multiple lines of text placeholder
// ---------------------------------------------------------------------------

interface SkeletonTextProps {
  lines?: number;
  /** Last line is shorter */
  lastLineShort?: boolean;
  className?: string;
  lineHeight?: string;
  gap?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineShort = true,
  className,
  lineHeight = "14px",
  gap = "10px",
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        return (
          <Skeleton
            key={i}
            width={isLast && lastLineShort ? "60%" : "100%"}
            height={lineHeight}
            rounded="sm"
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard — card placeholder
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  hasIcon?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonCard({ hasIcon = true, lines = 2, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-border-subtle rounded-lg p-5 shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-start gap-3">
        {hasIcon && <Skeleton width="36px" height="36px" rounded="full" />}
        <div className="flex-1 min-w-0">
          <Skeleton width="50%" height="16px" rounded="sm" className="mb-2" />
          <SkeletonText lines={lines} lineHeight="12px" gap="8px" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonMetric — metric tile placeholder
// ---------------------------------------------------------------------------

export function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "px-5 py-4 border border-border-subtle rounded-lg shadow-sm bg-surface-card",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton width="80px" height="12px" rounded="sm" className="mb-3" />
      <Skeleton width="100px" height="28px" rounded="sm" className="mb-2" />
      <Skeleton width="120px" height="10px" rounded="sm" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonTable — table placeholder with rows
// ---------------------------------------------------------------------------

interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function SkeletonTable({ columns = 5, rows = 6, className }: SkeletonTableProps) {
  return (
    <div className={cn("overflow-hidden", className)} aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 py-3 px-4 bg-surface-inset border-b-2 border-border mb-1">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`h-${i}`}
            width={i === 0 ? "30%" : `${Math.floor(70 / (columns - 1))}%`}
            height="14px"
            rounded="sm"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex gap-4 py-3 px-4 border-b border-border-subtle"
          style={{ opacity: 1 - rowIdx * 0.08 }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`c-${rowIdx}-${colIdx}`}
              width={colIdx === 0 ? "30%" : `${Math.floor(70 / (columns - 1))}%`}
              height="14px"
              rounded="sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonMetricGrid — grid of metric placeholders
// ---------------------------------------------------------------------------

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMetric key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonPage — full page loading placeholder
// ---------------------------------------------------------------------------

export function SkeletonPage() {
  return (
    <div className="max-w-page" aria-hidden="true">
      {/* Title area */}
      <div className="mb-6">
        <Skeleton width="240px" height="28px" rounded="sm" className="mb-3" />
        <Skeleton width="400px" height="14px" rounded="sm" />
      </div>
      {/* Metric grid */}
      <SkeletonMetricGrid count={4} />
      {/* Table area */}
      <div className="mt-6">
        <SkeletonTable columns={5} rows={8} />
      </div>
    </div>
  );
}
