/**
 * PromptBlockCard — displays a single prompt block in list view.
 * Shows key, title, kind badge, condition summary, status, and template preview.
 */

import { cn } from "../../lib/cn";
import type { PromptBlockResponse } from "../../api/promptAssemblyApi";

interface PromptBlockCardProps {
  block: PromptBlockResponse;
  onClick: (block: PromptBlockResponse) => void;
  selected?: boolean;
}

const KIND_COLORS: Record<string, string> = {
  core_system: "bg-brand-100 text-brand-700",
  behavior: "bg-info-light text-info-text",
  context: "bg-warning-light text-warning-text",
  output_contract: "bg-error-light text-error-text",
};

function kindBadgeClass(kind: string): string {
  return KIND_COLORS[kind] ?? "bg-neutral-100 text-neutral-600";
}

function truncateTemplate(template: string, maxLines = 2): string {
  const lines = template.split("\n").slice(0, maxLines);
  const joined = lines.join("\n");
  return joined.length < template.length ? joined + " …" : joined;
}

export function PromptBlockCard({ block, onClick, selected }: PromptBlockCardProps) {
  const isActive = block.status === "active";
  const hasOverride = !!block.admin_override_template;

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`prompt-block-card-${block.key}`}
      onClick={() => onClick(block)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(block);
        }
      }}
      className={cn(
        "bg-surface-card border rounded-lg p-4 cursor-pointer transition-colors",
        selected
          ? "border-brand-500 ring-2 ring-brand-200"
          : "border-border-subtle hover:border-brand-400"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Order badge */}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 text-xs font-mono font-bold shrink-0">
              {block.order_index}
            </span>
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {block.title}
            </span>
          </div>
          <code className="text-xs font-mono text-neutral-400 mt-0.5 block truncate">
            {block.key}
          </code>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
            isActive
              ? "bg-success-light text-success-text"
              : "bg-error-light text-error-text"
          )}
        >
          {isActive ? "Aktif" : "Devre Dışı"}
        </span>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span
          className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            kindBadgeClass(block.kind)
          )}
        >
          {block.kind}
        </span>

        {/* Condition summary */}
        {block.condition_type && block.condition_type !== "always" && (
          <span className="text-xs font-mono text-neutral-500 bg-surface-inset border border-border-subtle px-1.5 py-0.5 rounded">
            {block.condition_type}
          </span>
        )}

        {/* Source kind */}
        {hasOverride && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-info-light text-info-text">
            override
          </span>
        )}
      </div>

      {/* Template preview */}
      <pre className="text-xs text-neutral-600 bg-surface-inset rounded p-2 overflow-hidden whitespace-pre-wrap break-words leading-relaxed m-0 max-h-[52px] overflow-y-hidden">
        {truncateTemplate(block.effective_template)}
      </pre>
    </div>
  );
}
