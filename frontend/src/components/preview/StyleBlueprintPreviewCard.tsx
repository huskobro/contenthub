import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../design-system/primitives";

function safeJsonParse<T = Record<string, unknown>>(json: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

function MiniMotionDots({ level }: { level?: string }) {
  const count = level === "high" ? 3 : level === "low" ? 1 : 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-full",
            i <= count ? "bg-white/80 w-1.5 h-1.5" : "bg-white/25 w-1 h-1",
          )}
        />
      ))}
    </div>
  );
}

interface StyleBlueprintPreviewCardProps {
  blueprint: StyleBlueprintResponse;
  selected?: boolean;
  onClick?: () => void;
}

function parseRuleSummary(json: string | null, label: string): string | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    const keys = Object.keys(obj);
    if (keys.length === 0) return null;
    return `${label}: ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}`;
  } catch {
    return null;
  }
}

export function StyleBlueprintPreviewCard({
  blueprint,
  selected,
  onClick,
}: StyleBlueprintPreviewCardProps) {
  const b = blueprint;

  const rules = [
    parseRuleSummary(b.visual_rules_json, "Gorsel"),
    parseRuleSummary(b.motion_rules_json, "Hareket"),
    parseRuleSummary(b.layout_rules_json, "Duzenleme"),
    parseRuleSummary(b.subtitle_rules_json, "Altyazi"),
    parseRuleSummary(b.thumbnail_rules_json, "Thumbnail"),
  ].filter(Boolean) as string[];

  // Visual identity indicators based on rules
  const hasVisual = !!b.visual_rules_json;
  const hasMotion = !!b.motion_rules_json;
  const hasLayout = !!b.layout_rules_json;
  const hasSub = !!b.subtitle_rules_json;
  const hasThumb = !!b.thumbnail_rules_json;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200",
        "bg-gradient-to-br from-warning/10 to-warning/5",
        selected
          ? "border-brand-500 shadow-md ring-2 ring-brand-200"
          : "border-border-subtle hover:border-neutral-300 hover:shadow-sm",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      data-testid={`blueprint-card-${b.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h4 className="m-0 text-sm font-semibold text-neutral-900 truncate">{b.name}</h4>
        </div>
        <StatusBadge status={b.status === "active" ? "ready" : "draft"} label={b.status} size="sm" />
      </div>

      {/* Rule coverage indicators */}
      <div className="flex gap-1 mb-2">
        {[
          { has: hasVisual, label: "G", title: "Gorsel", color: "bg-violet-200 text-violet-800" },
          { has: hasMotion, label: "H", title: "Hareket", color: "bg-info-light text-info-dark" },
          { has: hasLayout, label: "D", title: "Duzenleme", color: "bg-success-light text-success-dark" },
          { has: hasSub, label: "A", title: "Altyazi", color: "bg-error-light text-error-dark" },
          { has: hasThumb, label: "T", title: "Thumbnail", color: "bg-warning-light text-warning-dark" },
        ].map((indicator) => (
          <span
            key={indicator.label}
            title={indicator.title}
            className={cn(
              "w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold",
              indicator.has ? indicator.color : "bg-neutral-100 text-neutral-300",
            )}
          >
            {indicator.label}
          </span>
        ))}
      </div>

      {/* Visual mini-preview frame */}
      <div className="relative rounded border border-neutral-200/50 overflow-hidden mb-1" style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #1e2340 0%, #13172b 100%)" }}>
        {/* Color palette dots */}
        {(() => {
          const vr = safeJsonParse<{ color_palette?: string[] }>(b.visual_rules_json);
          const palette = vr?.color_palette ?? [];
          return palette.length > 0 ? (
            <div className="absolute top-1 left-1 flex gap-0.5">
              {palette.slice(0, 4).map((c, i) => (
                <div key={i} className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
          ) : null;
        })()}
        {/* Motion indicator */}
        <div className="absolute top-1 right-1">
          <MiniMotionDots level={safeJsonParse<{ motion_level?: string }>(b.motion_rules_json)?.motion_level} />
        </div>
        {/* Layout direction mockup */}
        <div className="absolute inset-x-2 top-4 bottom-4 flex flex-col justify-center gap-0.5">
          <div className="w-8 h-1 rounded-sm bg-white/20" />
          <div className="w-12 h-0.5 rounded-sm bg-white/12" />
          <div className="w-10 h-0.5 rounded-sm bg-white/8" />
        </div>
        {/* Subtitle bar mockup */}
        {hasSub && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
            <div className="px-1.5 py-0.5 rounded-sm bg-black/50 text-[5px] text-white/70">altyazi</div>
          </div>
        )}
      </div>

      {/* Rule summary text */}
      <div className="bg-white/60 rounded border border-neutral-200/50 p-2 min-h-[28px]">
        {rules.length > 0 ? (
          <div className="space-y-0.5">
            {rules.slice(0, 2).map((r, i) => (
              <p key={i} className="m-0 text-[10px] text-neutral-600 truncate">{r}</p>
            ))}
          </div>
        ) : (
          <p className="m-0 text-xs text-neutral-400 italic">Kural tanimlanmamis</p>
        )}
      </div>

      {/* Footer — version trace + metadata */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="px-1 py-0.5 bg-neutral-100 rounded font-mono text-neutral-500" title={`Version ${b.version} · ${b.updated_at ? new Date(b.updated_at).toLocaleDateString("tr-TR") : ""}`}>
            v{b.version}
          </span>
          {b.module_scope && <span>{b.module_scope}</span>}
        </div>
        {b.notes && <span className="truncate max-w-[100px]">{b.notes}</span>}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-warning flex items-center justify-center text-white text-xs font-bold">
          &#10003;
        </div>
      )}
    </div>
  );
}
