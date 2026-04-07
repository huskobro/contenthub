/**
 * BlockBreakdownView — shows which blocks were included or skipped in an assembly run.
 * Reused by both PromptPreviewSection and JobPromptTracePanel.
 */

import { useState } from "react";
import type { BlockTraceResponse } from "../../api/promptAssemblyApi";
import { cn } from "../../lib/cn";

interface BlockRowProps {
  trace: BlockTraceResponse;
  included: boolean;
}

function BlockRow({ trace, included }: BlockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasText = !!trace.rendered_text;

  return (
    <div
      className={cn(
        "border rounded-md mb-1.5 overflow-hidden",
        included ? "border-success-light" : "border-border-subtle"
      )}
      data-testid={`block-trace-row-${trace.block_key}`}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          included ? "bg-success-light/40" : "bg-surface-inset"
        )}
      >
        {/* Order badge */}
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 text-xs font-mono font-bold shrink-0">
          {trace.order_index}
        </span>

        {/* Key + title */}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-neutral-800 truncate block">
            {trace.block_title}
          </span>
          <code className="text-xs font-mono text-neutral-400 block truncate">
            {trace.block_key}
          </code>
        </div>

        {/* Kind badge */}
        <span className="shrink-0 text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
          {trace.block_kind}
        </span>

        {/* Reason */}
        <span
          className={cn(
            "shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
            included
              ? "bg-success-light text-success-text"
              : "bg-neutral-100 text-neutral-600"
          )}
          title={trace.reason_code}
        >
          {trace.reason_text}
        </span>

        {/* Expand toggle (only if has rendered text) */}
        {included && hasText && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="shrink-0 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
            aria-expanded={expanded}
            data-testid={`block-trace-expand-${trace.block_key}`}
          >
            {expanded ? "Gizle" : "Göster"}
          </button>
        )}
      </div>

      {/* Expanded rendered text */}
      {expanded && hasText && (
        <div className="px-3 py-2 border-t border-success-light/50 bg-white">
          <pre className="text-xs text-neutral-700 whitespace-pre-wrap break-words m-0 font-mono leading-relaxed">
            {trace.rendered_text}
          </pre>
        </div>
      )}
    </div>
  );
}

interface BlockBreakdownViewProps {
  included: BlockTraceResponse[];
  skipped: BlockTraceResponse[];
}

export function BlockBreakdownView({ included, skipped }: BlockBreakdownViewProps) {
  return (
    <div data-testid="block-breakdown-view">
      {/* Included blocks */}
      <div className="mb-4">
        <h5 className="text-xs font-semibold text-success-text uppercase tracking-wider mb-2">
          ✓ Dahil Edilen Bloklar ({included.length})
        </h5>
        {included.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Hiçbir blok dahil edilmedi.</p>
        ) : (
          included.map((trace) => (
            <BlockRow key={trace.block_key} trace={trace} included={true} />
          ))
        )}
      </div>

      {/* Skipped blocks */}
      <div>
        <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          ✗ Atlanan Bloklar ({skipped.length})
        </h5>
        {skipped.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Atlanan blok yok.</p>
        ) : (
          skipped.map((trace) => (
            <BlockRow key={trace.block_key} trace={trace} included={false} />
          ))
        )}
      </div>
    </div>
  );
}
