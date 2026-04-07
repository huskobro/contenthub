/**
 * CompositionDirectionPreview — kompozisyon yönü seçici.
 *
 * 4 layout yönü için görsel şema kartları sunar.
 * Kartlar kavramsal düzen şemalarıdır — Remotion renderer'da
 * henüz implemente edilmemiştir. Seçim kaydedilir ve
 * renderer desteği eklendiğinde aktif olacaktır.
 */

import { cn } from "../../lib/cn";

interface CompositionDirectionPreviewProps {
  selected?: string;
  onSelect?: (direction: string) => void;
}

interface DirectionOption {
  id: string;
  label: string;
  description: string;
  render: () => React.ReactNode;
}

// Koyu tema renkleri — video içeriği mockup'ı için
const BG    = "#1a1f35";   // video alanı
const TEXT  = "#6b7db3";   // metin placeholder
const TEXT2 = "#4a5580";   // ikincil metin

const DIRECTIONS: DirectionOption[] = [
  {
    id: "classic",
    label: "Klasik",
    description: "Video üstte, metin altta",
    render: () => (
      <div className="flex flex-col h-full gap-1">
        {/* Video alanı — %65 */}
        <div className="rounded-sm" style={{ flex: "0 0 62%", background: BG }} />
        {/* Metin alanı */}
        <div className="flex flex-col justify-center gap-0.5" style={{ flex: 1 }}>
          <div className="h-1.5 rounded-sm" style={{ width: "80%", background: TEXT }} />
          <div className="h-1 rounded-sm" style={{ width: "55%", background: TEXT2 }} />
        </div>
      </div>
    ),
  },
  {
    id: "side_by_side",
    label: "Yan Yana",
    description: "Video solda, metin sağda",
    render: () => (
      <div className="flex h-full gap-1">
        {/* Video — sol yarı */}
        <div className="rounded-sm" style={{ flex: 1, background: BG }} />
        {/* Metin — sağ yarı */}
        <div className="flex flex-col justify-center gap-0.5" style={{ flex: 1 }}>
          <div className="h-1.5 rounded-sm" style={{ width: "90%", background: TEXT }} />
          <div className="h-1 rounded-sm" style={{ width: "75%", background: TEXT2 }} />
          <div className="h-1 rounded-sm mt-0.5" style={{ width: "50%", background: TEXT2 }} />
        </div>
      </div>
    ),
  },
  {
    id: "fullscreen",
    label: "Tam Ekran",
    description: "Video tam ekran, metin overlay",
    render: () => (
      <div className="relative h-full rounded-sm overflow-hidden" style={{ background: BG }}>
        {/* Alt gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "45%",
            background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
          }}
        />
        {/* Metin — overlay içinde alt kısım */}
        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
          <div className="h-1.5 rounded-sm" style={{ width: "75%", background: "rgba(255,255,255,0.85)" }} />
          <div className="h-1 rounded-sm" style={{ width: "45%", background: "rgba(255,255,255,0.55)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "dynamic",
    label: "Dinamik",
    description: "Değişken bölümlü yerleşim",
    render: () => (
      <div className="flex flex-col h-full gap-0.5">
        <div className="flex gap-0.5" style={{ flex: 1 }}>
          {/* Büyük video bloğu */}
          <div className="rounded-sm" style={{ flex: 2, background: BG }} />
          {/* Küçük metin bloğu */}
          <div className="rounded-sm flex flex-col justify-center gap-0.5 p-0.5" style={{ flex: 1, background: "#141829" }}>
            <div className="h-1 rounded-sm" style={{ width: "80%", background: TEXT }} />
            <div className="h-1 rounded-sm" style={{ width: "60%", background: TEXT2 }} />
          </div>
        </div>
        <div className="flex gap-0.5" style={{ flex: 1 }}>
          {/* Küçük metin bloğu */}
          <div className="rounded-sm flex flex-col justify-center gap-0.5 p-0.5" style={{ flex: 1, background: "#141829" }}>
            <div className="h-1 rounded-sm" style={{ width: "70%", background: TEXT }} />
            <div className="h-1 rounded-sm" style={{ width: "50%", background: TEXT2 }} />
          </div>
          {/* Büyük video bloğu */}
          <div className="rounded-sm" style={{ flex: 2, background: BG }} />
        </div>
      </div>
    ),
  },
];

export function CompositionDirectionPreview({
  selected,
  onSelect,
}: CompositionDirectionPreviewProps) {
  return (
    <div data-testid="composition-direction-preview">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect?.(d.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-150 cursor-pointer",
              selected === d.id
                ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 rounded" style={{ background: "#0f1220" }}>
              {d.render()}
            </div>
            <div className="text-center">
              <span className={cn(
                "block text-xs font-medium",
                selected === d.id ? "text-brand-700" : "text-neutral-700",
              )}>
                {d.label}
              </span>
              <span className="block text-[9px] text-neutral-400 mt-0.5">{d.description}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        Düzen şeması — Remotion render desteği yakında eklenecek
      </p>
    </div>
  );
}
