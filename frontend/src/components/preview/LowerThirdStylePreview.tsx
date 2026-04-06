/**
 * LowerThirdStylePreview — M32 preview-first alt bant stil secici.
 *
 * Uc farkli alt bant stili icin CSS tabanli gorsel onizleme sunar.
 * Stil karti pattern'i CompositionDirectionPreview ile aynidir.
 *
 * PREVIEW vs FINAL ayrimi:
 *   Bu component CSS tabanli bir PREVIEW gosterir.
 *   Final artifact Remotion render ciktisidir.
 */

import { cn } from "../../lib/cn";

interface LowerThirdStylePreviewProps {
  selected: string | undefined;
  onSelect: (style: string) => void;
}

interface LowerThirdOption {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

const LOWER_THIRD_STYLES: LowerThirdOption[] = [
  {
    id: "broadcast",
    label: "TV Broadcast",
    render: () => (
      <div className="relative h-full bg-neutral-200 rounded-sm overflow-hidden">
        {/* Video area placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 to-neutral-300" />
        {/* Broadcast lower third */}
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className="flex items-center gap-1.5 px-1.5 py-1"
            style={{ background: "#1a1a3e", borderLeft: "3px solid #e53e3e" }}
          >
            <div className="flex-1 min-w-0">
              <div className="h-1.5 w-3/4 bg-white rounded-sm mb-0.5" />
              <div className="h-1 w-1/2 rounded-sm" style={{ background: "#9ca3af" }} />
            </div>
            <div className="text-[6px] font-bold text-white/60 shrink-0">1/3</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    render: () => (
      <div className="relative h-full bg-neutral-200 rounded-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 to-neutral-300" />
        {/* Minimal lower third */}
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className="px-1.5 py-1"
            style={{
              background: "rgba(0,0,0,0.5)",
              borderTop: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div className="h-1.5 w-2/3 bg-white/80 rounded-sm mb-0.5" />
            <div className="h-1 w-1/3 bg-white/40 rounded-sm" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "modern",
    label: "Modern",
    render: () => (
      <div className="relative h-full bg-neutral-200 rounded-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 to-neutral-300" />
        {/* Modern lower third */}
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className="px-1.5 py-1"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0.7), transparent)",
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <div
                className="h-1.5 w-6 rounded-full"
                style={{ background: "#3b82f6" }}
              />
            </div>
            <div className="h-2 w-3/4 bg-white rounded-sm font-bold" />
          </div>
        </div>
      </div>
    ),
  },
];

export function LowerThirdStylePreview({
  selected,
  onSelect,
}: LowerThirdStylePreviewProps) {
  return (
    <div data-testid="lower-third-style-preview">
      <div className="grid grid-cols-3 gap-3">
        {LOWER_THIRD_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 bg-white transition-all duration-150 cursor-pointer",
              selected === s.id
                ? "border-blue-500 shadow-md ring-2 ring-blue-200"
                : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 bg-neutral-50 rounded">
              {s.render()}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                selected === s.id ? "text-blue-700" : "text-neutral-600",
              )}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        CSS onizleme — nihai Remotion ciktisi farkli olabilir
      </p>
    </div>
  );
}
