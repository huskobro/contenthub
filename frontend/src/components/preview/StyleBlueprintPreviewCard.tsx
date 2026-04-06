import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../design-system/primitives";

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
        "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
        selected
          ? "border-amber-400 shadow-md ring-2 ring-amber-200"
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
          <span className="text-xs text-neutral-500">v{b.version}</span>
        </div>
        <StatusBadge status={b.status === "active" ? "ready" : "draft"} label={b.status} size="sm" />
      </div>

      {/* Rule coverage indicators */}
      <div className="flex gap-1 mb-2">
        {[
          { has: hasVisual, label: "G", title: "Gorsel", color: "bg-violet-200 text-violet-800" },
          { has: hasMotion, label: "H", title: "Hareket", color: "bg-blue-200 text-blue-800" },
          { has: hasLayout, label: "D", title: "Duzenleme", color: "bg-teal-200 text-teal-800" },
          { has: hasSub, label: "A", title: "Altyazi", color: "bg-rose-200 text-rose-800" },
          { has: hasThumb, label: "T", title: "Thumbnail", color: "bg-amber-200 text-amber-800" },
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

      {/* Rule summary */}
      <div className="bg-white/60 rounded border border-neutral-200/50 p-2 min-h-[36px]">
        {rules.length > 0 ? (
          <div className="space-y-0.5">
            {rules.slice(0, 3).map((r, i) => (
              <p key={i} className="m-0 text-[10px] text-neutral-600 truncate">{r}</p>
            ))}
          </div>
        ) : (
          <p className="m-0 text-xs text-neutral-400 italic">Kural tanimlanmamis</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400">
        {b.module_scope && <span>{b.module_scope}</span>}
        {b.notes && <span className="truncate max-w-[120px]">{b.notes}</span>}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
          &#10003;
        </div>
      )}
    </div>
  );
}
