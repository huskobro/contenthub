/**
 * ThumbnailDirectionPreview — thumbnail yönü seçici.
 *
 * 4 thumbnail kompozisyon yönü için görsel şema kartları sunar.
 * Kartlar kavramsal düzen şemalarıdır — Remotion thumbnail renderer'da
 * henüz implemente edilmemiştir. Seçim kaydedilir ve
 * renderer desteği eklendiğinde aktif olacaktır.
 */

import { cn } from "../../lib/cn";

interface ThumbnailDirectionPreviewProps {
  selected?: string;
  onSelect?: (direction: string) => void;
}

interface ThumbOption {
  id: string;
  label: string;
  description: string;
  render: () => React.ReactNode;
}

// Koyu tema — thumbnail mockup renkleri
const IMG   = "#1a2540";   // görsel alanı
const TITLE = "#e2e8f0";   // başlık placeholder
const SUB   = "#6b7db3";   // alt metin placeholder
const BADGE = "#2563eb";   // vurgu rozet

const THUMB_STYLES: ThumbOption[] = [
  {
    id: "text_heavy",
    label: "Metin Ağırlıklı",
    description: "Büyük başlık + alt metin odaklı",
    render: () => (
      <div
        className="h-full rounded-sm flex flex-col justify-center items-center gap-0.5 p-1.5"
        style={{ background: "linear-gradient(135deg, #0f1220 0%, #1a2035 100%)" }}
      >
        {/* Büyük başlık */}
        <div className="h-2 rounded-sm" style={{ width: "82%", background: TITLE }} />
        <div className="h-2 rounded-sm" style={{ width: "65%", background: TITLE }} />
        {/* Alt metin */}
        <div className="h-1.5 rounded-sm mt-0.5" style={{ width: "55%", background: SUB }} />
        {/* Rozet/logo alanı */}
        <div className="h-2 rounded-sm mt-1 px-1.5 flex items-center justify-center" style={{ width: "30%", background: BADGE }}>
          <div className="h-0.5 rounded-sm" style={{ width: "80%", background: "rgba(255,255,255,0.8)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "image_heavy",
    label: "Görsel Ağırlıklı",
    description: "Tam ekran görsel + minimal metin",
    render: () => (
      <div className="relative h-full rounded-sm overflow-hidden" style={{ background: IMG }}>
        {/* Görsel dolgusu — tam alan */}
        <div className="absolute inset-0 opacity-60" style={{ background: "linear-gradient(135deg, #1a3a6a 0%, #0f1f45 100%)" }} />
        {/* Alt gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
        />
        {/* Metin — alt köşe */}
        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
          <div className="h-1.5 rounded-sm" style={{ width: "60%", background: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "split",
    label: "Bölünmüş",
    description: "Sol görsel, sağ metin",
    render: () => (
      <div className="flex h-full rounded-sm overflow-hidden gap-px">
        {/* Sol — görsel */}
        <div className="rounded-l-sm" style={{ flex: 1, background: IMG }}>
          <div className="h-full w-full opacity-70" style={{ background: "linear-gradient(135deg, #1a3a6a 0%, #0f1f45 100%)" }} />
        </div>
        {/* Sağ — metin */}
        <div
          className="rounded-r-sm flex flex-col justify-center gap-0.5 p-1"
          style={{ flex: 1, background: "#0f1220" }}
        >
          <div className="h-1.5 rounded-sm" style={{ width: "90%", background: TITLE }} />
          <div className="h-1.5 rounded-sm" style={{ width: "75%", background: TITLE }} />
          <div className="h-1 rounded-sm mt-0.5" style={{ width: "55%", background: SUB }} />
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Sade arka plan + ortalanmış başlık",
    render: () => (
      <div
        className="h-full rounded-sm flex flex-col justify-center items-center gap-0.5"
        style={{ background: "#0a0d1a" }}
      >
        {/* İnce üst çizgi */}
        <div className="h-px mb-1" style={{ width: "40%", background: BADGE }} />
        {/* Başlık */}
        <div className="h-1.5 rounded-sm" style={{ width: "70%", background: TITLE }} />
        <div className="h-1.5 rounded-sm" style={{ width: "50%", background: TITLE }} />
        {/* İnce alt çizgi */}
        <div className="h-px mt-1" style={{ width: "40%", background: BADGE }} />
      </div>
    ),
  },
];

export function ThumbnailDirectionPreview({
  selected,
  onSelect,
}: ThumbnailDirectionPreviewProps) {
  return (
    <div data-testid="thumbnail-direction-preview">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {THUMB_STYLES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-150 cursor-pointer",
              selected === t.id
                ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 rounded" style={{ background: "#07090f" }}>
              {t.render()}
            </div>
            <div className="text-center">
              <span className={cn(
                "block text-xs font-medium",
                selected === t.id ? "text-brand-700" : "text-neutral-700",
              )}>
                {t.label}
              </span>
              <span className="block text-[9px] text-neutral-400 mt-0.5">{t.description}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        Thumbnail şeması — Remotion render desteği yakında eklenecek
      </p>
    </div>
  );
}
