/**
 * MotionLevelPreview — hareket seviyesi seçici.
 *
 * Üç seviye: low, medium, high
 * Her kart animasyonlu dot göstergesi ve açıklama içerir.
 * BlueprintVisualPreview içindeki MotionIndicator'dan bağımsız,
 * kullanıcı seçimi için standalone picker.
 *
 * CSS inline preview — Remotion render değil.
 */

import { cn } from "../../lib/cn";

interface MotionLevelPreviewProps {
  selected: string | undefined;
  onSelect: (level: string) => void;
}

interface MotionOption {
  id: string;
  label: string;
  description: string;
  dots: number;
  speed: string; // animation speed class
}

const MOTION_LEVELS: MotionOption[] = [
  {
    id: "low",
    label: "Dusuk",
    description: "Yavas gecisler, minimal hareket",
    dots: 1,
    speed: "2s",
  },
  {
    id: "medium",
    label: "Orta",
    description: "Dengeli gecisler, standart hareket",
    dots: 2,
    speed: "1.2s",
  },
  {
    id: "high",
    label: "Yuksek",
    description: "Hizli gecisler, dinamik hareket",
    dots: 3,
    speed: "0.6s",
  },
];

export function MotionLevelPreview({
  selected,
  onSelect,
}: MotionLevelPreviewProps) {
  return (
    <div data-testid="motion-level-preview">
      <div className="grid grid-cols-3 gap-3">
        {MOTION_LEVELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 bg-white transition-all duration-150 cursor-pointer",
              selected === m.id
                ? "border-brand-500 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            {/* Animated dots */}
            <div className="flex items-center gap-1.5 h-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all",
                    i <= m.dots ? "bg-brand-500" : "bg-neutral-200",
                    i <= m.dots ? "w-3 h-3" : "w-2 h-2",
                  )}
                  style={
                    i <= m.dots
                      ? {
                          animation: `pulse ${m.speed} ease-in-out infinite`,
                          animationDelay: `${i * 150}ms`,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                selected === m.id ? "text-brand-700" : "text-neutral-700",
              )}
            >
              {m.label}
            </span>
            <span className="text-[10px] text-neutral-400 text-center leading-tight">
              {m.description}
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
