/**
 * EmptyState — Beautiful empty state component
 *
 * Shown when a list/table/page has no data.
 * Includes illustration, title, description, and optional action button.
 * Multiple preset illustrations for different contexts.
 */

import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Illustration presets — SVG inline illustrations
// ---------------------------------------------------------------------------

type IllustrationPreset =
  | "no-data"
  | "no-results"
  | "no-jobs"
  | "no-content"
  | "no-sources"
  | "no-templates"
  | "no-analytics"
  | "error"
  | "success"
  | "empty-inbox";

function EmptyIllustration({ preset, size = 120 }: { preset: IllustrationPreset; size?: number }) {
  const s = size;
  const half = s / 2;
  const color1 = "var(--ch-brand-200, #c3d4ff)";
  const color2 = "var(--ch-brand-400, #6b8cff)";
  const color3 = "var(--ch-neutral-300, #dee2e6)";
  const colorBg = "var(--ch-brand-50, #f0f4ff)";

  const illustrations: Record<IllustrationPreset, React.ReactNode> = {
    "no-data": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <rect x="35" y="32" width="50" height="56" rx="6" fill={color3} opacity="0.5" />
        <rect x="40" y="42" width="30" height="4" rx="2" fill={color1} />
        <rect x="40" y="52" width="36" height="4" rx="2" fill={color1} />
        <rect x="40" y="62" width="24" height="4" rx="2" fill={color1} />
        <circle cx="80" cy="78" r="16" fill={color2} opacity="0.2" />
        <path d="M76 78l3 3 6-6" stroke={color2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    "no-results": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <circle cx="54" cy="54" r="20" stroke={color2} strokeWidth="3" fill="none" />
        <line x1="68" y1="68" x2="84" y2="84" stroke={color2} strokeWidth="3" strokeLinecap="round" />
        <line x1="47" y1="48" x2="61" y2="60" stroke={color3} strokeWidth="2" strokeLinecap="round" />
        <line x1="61" y1="48" x2="47" y2="60" stroke={color3} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    "no-jobs": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <rect x="30" y="40" width="60" height="40" rx="6" fill={color3} opacity="0.4" />
        <circle cx="60" cy="56" r="10" fill={color2} opacity="0.3" />
        <path d="M56 56l3 3 6-7" stroke={color2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="70" width="36" height="3" rx="1.5" fill={color1} />
      </svg>
    ),
    "no-content": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <rect x="32" y="28" width="56" height="64" rx="6" fill={color3} opacity="0.4" />
        <rect x="40" y="38" width="20" height="3" rx="1.5" fill={color2} opacity="0.6" />
        <rect x="40" y="46" width="32" height="3" rx="1.5" fill={color1} />
        <rect x="40" y="54" width="28" height="3" rx="1.5" fill={color1} />
        <rect x="40" y="62" width="36" height="3" rx="1.5" fill={color1} />
        <circle cx="80" cy="80" r="14" fill={color2} opacity="0.15" />
        <line x1="76" y1="80" x2="84" y2="80" stroke={color2} strokeWidth="2" strokeLinecap="round" />
        <line x1="80" y1="76" x2="80" y2="84" stroke={color2} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    "no-sources": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <circle cx="42" cy="50" r="12" stroke={color2} strokeWidth="2" fill="none" />
        <circle cx="78" cy="50" r="12" stroke={color2} strokeWidth="2" fill="none" />
        <circle cx="60" cy="78" r="12" stroke={color2} strokeWidth="2" fill="none" />
        <line x1="52" y1="55" x2="70" y2="73" stroke={color3} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="68" y1="55" x2="50" y2="73" stroke={color3} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="54" y1="50" x2="66" y2="50" stroke={color3} strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    ),
    "no-templates": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <rect x="28" y="35" width="28" height="22" rx="4" fill={color2} opacity="0.2" />
        <rect x="64" y="35" width="28" height="22" rx="4" fill={color2} opacity="0.15" />
        <rect x="28" y="63" width="28" height="22" rx="4" fill={color2} opacity="0.15" />
        <rect x="64" y="63" width="28" height="22" rx="4" fill={color2} opacity="0.1" />
        <rect x="34" y="41" width="16" height="2" rx="1" fill={color2} opacity="0.5" />
        <rect x="34" y="47" width="12" height="2" rx="1" fill={color1} />
      </svg>
    ),
    "no-analytics": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <rect x="30" y="72" width="12" height="20" rx="2" fill={color2} opacity="0.2" />
        <rect x="48" y="58" width="12" height="34" rx="2" fill={color2} opacity="0.3" />
        <rect x="66" y="44" width="12" height="48" rx="2" fill={color2} opacity="0.4" />
        <rect x="84" y="52" width="12" height="40" rx="2" fill={color2} opacity="0.25" />
        <line x1="28" y1="92" x2="98" y2="92" stroke={color3} strokeWidth="1.5" />
      </svg>
    ),
    error: (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="var(--ch-error-light, #ffe0e0)" />
        <circle cx="60" cy="56" r="22" fill="var(--ch-error, #e03131)" opacity="0.15" />
        <line x1="52" y1="48" x2="68" y2="64" stroke="var(--ch-error, #e03131)" strokeWidth="3" strokeLinecap="round" />
        <line x1="68" y1="48" x2="52" y2="64" stroke="var(--ch-error, #e03131)" strokeWidth="3" strokeLinecap="round" />
        <rect x="50" y="82" width="20" height="3" rx="1.5" fill="var(--ch-error, #e03131)" opacity="0.3" />
      </svg>
    ),
    success: (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="var(--ch-success-light, #e0ffe0)" />
        <circle cx="60" cy="56" r="22" fill="var(--ch-success-base, #2b8a3e)" opacity="0.15" />
        <path d="M49 56l7 7 15-16" stroke="var(--ch-success-base, #2b8a3e)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    "empty-inbox": (
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill={colorBg} />
        <path d="M30 50l30 20 30-20v30a6 6 0 01-6 6H36a6 6 0 01-6-6V50z" fill={color2} opacity="0.15" />
        <path d="M30 50l30 20 30-20" stroke={color2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="60" cy="40" r="4" fill={color2} opacity="0.3" />
      </svg>
    ),
  };

  return <div className="mb-4">{illustrations[preset] || illustrations["no-data"]}</div>;
}

// ---------------------------------------------------------------------------
// EmptyState component
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  /** Illustration preset */
  illustration?: IllustrationPreset;
  /** Main heading */
  title: string;
  /** Supporting description */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom illustration size */
  illustrationSize?: number;
  className?: string;
  testId?: string;
}

export function EmptyState({
  illustration = "no-data",
  title,
  description,
  action,
  secondaryAction,
  illustrationSize = 120,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className,
      )}
      data-testid={testId}
    >
      <EmptyIllustration preset={illustration} size={illustrationSize} />

      <h3 className="m-0 text-lg font-semibold text-neutral-800 font-heading tracking-[-0.01em]">
        {title}
      </h3>

      {description && (
        <p className="mt-2 mb-0 text-sm text-neutral-500 leading-relaxed max-w-[400px]">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex gap-3 mt-5">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-all duration-fast",
                action.variant === "secondary" || !action.variant
                  ? "bg-surface-card text-neutral-700 border-border hover:bg-neutral-50 hover:border-brand-400"
                  : "bg-gradient-to-br from-brand-600 to-brand-700 text-white border-brand-600 hover:from-brand-700 hover:to-brand-800 shadow-sm",
              )}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-sm font-medium text-neutral-500 bg-transparent border-none cursor-pointer transition-colors duration-fast hover:text-neutral-700"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
