import { cn } from "../../lib/cn";

interface BlueprintVisualPreviewProps {
  visualRules?: { color_palette?: string[]; image_style?: string; brightness?: string };
  motionRules?: { motion_level?: string; transition_style?: string; voice_style?: string };
  layoutRules?: { layout_direction?: string; text_position?: string };
  subtitleRules?: { font_family?: string; font_size?: string; color?: string; highlight_color?: string; position?: string };
  thumbnailRules?: { style?: string; text_overlay?: boolean; branding?: boolean };
}

const MOTION_LEVELS: Record<string, number> = { low: 1, medium: 2, high: 3 };

function MotionIndicator({ level }: { level?: string }) {
  const count = MOTION_LEVELS[level ?? ""] ?? 2;
  return (
    <div className="flex items-center gap-1" title={`Hareket: ${level ?? "medium"}`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all",
            i <= count ? "bg-blue-400" : "bg-neutral-300",
            i <= count ? "w-2 h-2 animate-pulse" : "w-1.5 h-1.5",
          )}
          style={i <= count ? { animationDelay: `${i * 200}ms` } : undefined}
        />
      ))}
      <span className="text-[9px] text-white/70 ml-0.5">{level ?? "medium"}</span>
    </div>
  );
}

function layoutPositionClasses(direction?: string, textPosition?: string): string {
  if (direction === "rtl" || textPosition === "right") return "items-end text-right";
  if (direction === "center" || textPosition === "center") return "items-center text-center";
  return "items-start text-left";
}

export function BlueprintVisualPreview({
  visualRules,
  motionRules,
  layoutRules,
  subtitleRules,
  thumbnailRules,
}: BlueprintVisualPreviewProps) {
  const palette = visualRules?.color_palette ?? [];
  const subPos = subtitleRules?.position ?? "bottom";

  return (
    <div className="max-w-md" data-testid="blueprint-visual-preview">
      {/* 16:9 mock frame */}
      <div
        className={cn(
          "relative aspect-video rounded-lg shadow-lg overflow-hidden border border-neutral-200",
          "bg-gradient-to-br from-neutral-800 to-neutral-900",
        )}
      >
        {/* Color palette swatches */}
        {palette.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1">
            {palette.slice(0, 6).map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}

        {/* Motion indicator */}
        <div className="absolute top-2 right-2">
          <MotionIndicator level={motionRules?.motion_level} />
        </div>

        {/* Layout direction visualization */}
        <div className={cn("absolute inset-x-4 top-10 bottom-10 flex flex-col justify-center gap-2", layoutPositionClasses(layoutRules?.layout_direction, layoutRules?.text_position))}>
          <div className="w-16 h-2.5 rounded-sm bg-white/25" />
          <div className="w-24 h-2 rounded-sm bg-white/15" />
          <div className="w-20 h-2 rounded-sm bg-white/10" />
        </div>

        {/* Thumbnail indicator */}
        {thumbnailRules && (
          <div className="absolute bottom-8 right-3 flex gap-1 items-center">
            {thumbnailRules.text_overlay && (
              <span className="text-[8px] bg-white/20 text-white/60 px-1 rounded">T</span>
            )}
            {thumbnailRules.branding && (
              <span className="text-[8px] bg-white/20 text-white/60 px-1 rounded">B</span>
            )}
          </div>
        )}

        {/* Subtitle preview bar */}
        <div
          className={cn(
            "absolute left-0 right-0 flex justify-center px-3",
            subPos === "top" ? "top-2" : "bottom-2",
          )}
        >
          <div
            className="px-3 py-1 rounded"
            style={{
              fontFamily: subtitleRules?.font_family ?? "sans-serif",
              fontSize: subtitleRules?.font_size ?? "12px",
              color: subtitleRules?.color ?? "#ffffff",
              backgroundColor: subtitleRules?.highlight_color ?? "rgba(0,0,0,0.6)",
            }}
          >
            <span>Ornek altyazi metni</span>
          </div>
        </div>

        {/* Image style tag */}
        {visualRules?.image_style && (
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-white/50 bg-white/10 px-1.5 rounded">
            {visualRules.image_style}
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        Onizleme — nihai cikti farkli olabilir
      </p>
    </div>
  );
}
