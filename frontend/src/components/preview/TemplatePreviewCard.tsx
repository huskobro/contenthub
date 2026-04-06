import type { TemplateResponse } from "../../api/templatesApi";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../design-system/primitives";

interface TemplatePreviewCardProps {
  template: TemplateResponse;
  selected?: boolean;
  onClick?: () => void;
}

function safeJsonKeys(json: string | null): string[] {
  if (!json) return [];
  try {
    const obj = JSON.parse(json);
    return Object.keys(obj).slice(0, 4);
  } catch {
    return [];
  }
}

const TYPE_COLORS: Record<string, string> = {
  style: "from-violet-500/20 to-violet-600/5",
  content: "from-sky-500/20 to-sky-600/5",
  publish: "from-emerald-500/20 to-emerald-600/5",
};

const TYPE_BORDER: Record<string, string> = {
  style: "border-violet-300",
  content: "border-sky-300",
  publish: "border-success",
};

export function TemplatePreviewCard({
  template,
  selected,
  onClick,
}: TemplatePreviewCardProps) {
  const t = template;
  const typeColor = TYPE_COLORS[t.template_type] ?? "from-neutral-200/50 to-neutral-300/10";
  const styleKeys = safeJsonKeys(t.style_profile_json);
  const contentKeys = safeJsonKeys(t.content_rules_json);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200",
        "bg-gradient-to-br",
        typeColor,
        selected
          ? (TYPE_BORDER[t.template_type] ?? "border-brand-400") + " shadow-md ring-2 ring-brand-200"
          : "border-border-subtle hover:border-neutral-300 hover:shadow-sm",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      data-testid={`template-card-${t.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h4 className="m-0 text-sm font-semibold text-neutral-900 truncate">{t.name}</h4>
          <span className="text-xs text-neutral-500">{t.template_type} &middot; v{t.version}</span>
        </div>
        <StatusBadge status={t.status === "active" ? "ready" : "draft"} label={t.status} size="sm" />
      </div>

      {/* Mock preview area */}
      <div className="bg-white/60 rounded border border-neutral-200/50 p-2 mb-2 min-h-[48px]">
        {t.description ? (
          <p className="m-0 text-xs text-neutral-600 line-clamp-2">{t.description}</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {styleKeys.map((k) => (
              <span key={k} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] rounded">
                {k}
              </span>
            ))}
            {contentKeys.map((k) => (
              <span key={k} className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] rounded">
                {k}
              </span>
            ))}
            {styleKeys.length === 0 && contentKeys.length === 0 && (
              <span className="text-xs text-neutral-400 italic">Profil tanimlanmamis</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400">
        <span>{t.owner_scope}</span>
        {t.module_scope && <span>{t.module_scope}</span>}
        {t.style_link_count != null && t.style_link_count > 0 && (
          <span>{t.style_link_count} stil baglantisi</span>
        )}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
          &#10003;
        </div>
      )}
    </div>
  );
}
