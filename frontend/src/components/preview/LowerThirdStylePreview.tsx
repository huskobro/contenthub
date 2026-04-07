/**
 * LowerThirdStylePreview — alt bant stil seçici.
 *
 * Her kart BulletinLowerThird.tsx renderer'ındaki gerçek renk ve
 * layout değerlerini birebir yansıtır:
 *
 *   broadcast : #0a0f2c bg, #e31414 sol aksant bar, beyaz başlık, gri kategori
 *   minimal   : rgba(0,0,0,0.55) bg, rgba(255,255,255,0.8) üst border
 *   modern    : gradient bg (rgba(10,15,44)), mavi kategori pill (#2563eb)
 *
 * CSS inline preview — Remotion render değil.
 * Renk ve layout değerleri BulletinLowerThird.tsx ile senkronize tutulmalıdır.
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

// Renderer değerleri (BulletinLowerThird.tsx) ile senkronize
const LOWER_THIRD_STYLES: LowerThirdOption[] = [
  {
    id: "broadcast",
    label: "TV Broadcast",
    render: () => (
      <div className="relative h-full rounded-sm overflow-hidden" style={{ background: "#181c2e" }}>
        {/* Video alanı mockup */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1e2340 0%, #13172b 100%)" }} />
        {/* Broadcast lower-third — BulletinLowerThird BroadcastBar ile eşleşir */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center" style={{ background: "#0a0f2c", height: 22 }}>
          {/* Sol kırmızı aksant bar */}
          <div style={{ width: 4, height: "100%", background: "#e31414", flexShrink: 0 }} />
          {/* Metin alanı */}
          <div className="flex-1 flex flex-col justify-center px-1.5 overflow-hidden">
            <div className="h-1.5 rounded-sm" style={{ width: "72%", background: "#FFFFFF" }} />
            <div className="h-1 rounded-sm mt-0.5" style={{ width: "45%", background: "#aaaaaa" }} />
          </div>
          {/* Sayaç */}
          <div className="text-[5px] font-bold shrink-0 px-1" style={{ color: "#888888" }}>1/3</div>
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    render: () => (
      <div className="relative h-full rounded-sm overflow-hidden" style={{ background: "linear-gradient(160deg, #1e2340 0%, #13172b 100%)" }}>
        {/* Minimal lower-third — BulletinLowerThird MinimalBar ile eşleşir */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center px-1.5"
          style={{
            background: "rgba(0,0,0,0.55)",
            borderTop: "1px solid rgba(255,255,255,0.8)",
            height: 22,
          }}
        >
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <div className="h-1.5 rounded-sm" style={{ width: "68%", background: "#FFFFFF" }} />
            <div className="h-1 rounded-sm mt-0.5" style={{ width: "40%", background: "rgba(255,255,255,0.6)" }} />
          </div>
          <div className="text-[5px] shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>1/3</div>
        </div>
      </div>
    ),
  },
  {
    id: "modern",
    label: "Modern",
    render: () => (
      <div className="relative h-full rounded-sm overflow-hidden" style={{ background: "linear-gradient(160deg, #1e2340 0%, #13172b 100%)" }}>
        {/* Modern lower-third — BulletinLowerThird ModernBar ile eşleşir */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-1.5"
          style={{
            background: "linear-gradient(90deg, rgba(10,15,44,0.97) 0%, rgba(10,15,44,0.7) 75%, transparent 100%)",
            height: 22,
          }}
        >
          {/* Kategori pill — mavi (#2563eb) */}
          <div
            className="text-[5px] font-bold shrink-0 px-1 rounded-sm"
            style={{ background: "#2563eb", color: "#FFF", letterSpacing: "0.04em" }}
          >
            KATEGORİ
          </div>
          {/* Başlık */}
          <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "#FFFFFF" }} />
          {/* Sayaç */}
          <div className="text-[5px] shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>1/3</div>
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
                ? "border-brand-500 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 bg-neutral-900 rounded">
              {s.render()}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                selected === s.id ? "text-brand-700" : "text-neutral-600",
              )}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        CSS önizleme — nihai Remotion çıktısı farklı olabilir
      </p>
    </div>
  );
}
