import { cn } from "../../lib/cn";

interface TemplateVisualPreviewProps {
  templateName?: string;
  styleProfile?: { primary_color?: string; secondary_color?: string; font_style?: string };
  contentRules?: { tone?: string; language?: string; max_duration?: number };
}

const FONT_LABELS: Record<string, string> = {
  serif: "Serif",
  "sans-serif": "Sans-serif",
  monospace: "Monospace",
  display: "Display",
};

export function TemplateVisualPreview({
  templateName,
  styleProfile,
  contentRules,
}: TemplateVisualPreviewProps) {
  const primary = styleProfile?.primary_color ?? "#6366f1";
  const secondary = styleProfile?.secondary_color ?? "#a5b4fc";
  const fontStyle = styleProfile?.font_style;

  return (
    <div className="max-w-sm rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden" data-testid="template-visual-preview">
      {/* Header */}
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Sablon Onizlemesi
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Template name */}
        {templateName && (
          <h4 className="m-0 text-sm font-semibold text-neutral-800 truncate">{templateName}</h4>
        )}

        {/* Color swatch bar */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-8 h-5 rounded" style={{ backgroundColor: primary }} title={`Birincil: ${primary}`} />
            <div className="w-8 h-5 rounded" style={{ backgroundColor: secondary }} title={`Ikincil: ${secondary}`} />
          </div>
          <div
            className="flex-1 h-2 rounded-full"
            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
          />
        </div>

        {/* Font style indicator */}
        {fontStyle && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500">Font:</span>
            <span
              className={cn("text-xs text-neutral-700 px-1.5 py-0.5 bg-neutral-100 rounded")}
              style={{ fontFamily: fontStyle }}
            >
              {FONT_LABELS[fontStyle] ?? fontStyle}
            </span>
          </div>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {contentRules?.tone && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-100 text-violet-700">
              {contentRules.tone}
            </span>
          )}
          {contentRules?.language && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-sky-100 text-sky-700">
              {contentRules.language}
            </span>
          )}
          {contentRules?.max_duration != null && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
              {contentRules.max_duration}s
            </span>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-3 py-1.5 border-t border-neutral-100 bg-neutral-50">
        <p className="m-0 text-[9px] text-neutral-400 italic text-center">
          Onizleme — nihai cikti farkli olabilir
        </p>
      </div>
    </div>
  );
}
