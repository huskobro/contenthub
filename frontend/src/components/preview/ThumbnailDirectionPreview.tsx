import { cn } from "../../lib/cn";

interface ThumbnailDirectionPreviewProps {
  selected?: string;
  onSelect?: (direction: string) => void;
}

interface ThumbOption {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

const THUMB_STYLES: ThumbOption[] = [
  {
    id: "text_heavy",
    label: "Metin Agirlikli",
    render: () => (
      <div className="flex flex-col h-full justify-center items-center gap-0.5 bg-neutral-100 rounded-sm p-1">
        <div className="h-2 w-4/5 bg-neutral-500 rounded-sm" />
        <div className="h-1.5 w-3/5 bg-neutral-400 rounded-sm" />
        <div className="h-3 w-1/3 bg-neutral-300 rounded-sm mt-0.5" />
      </div>
    ),
  },
  {
    id: "image_heavy",
    label: "Gorsel Agirlikli",
    render: () => (
      <div className="relative h-full bg-neutral-300 rounded-sm">
        <div className="absolute bottom-0.5 left-0.5 right-0.5">
          <div className="h-1.5 w-1/2 bg-white/80 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "split",
    label: "Bolunmus",
    render: () => (
      <div className="flex h-full gap-0.5">
        <div className="flex-1 bg-neutral-300 rounded-sm" />
        <div className="flex-1 flex flex-col justify-center gap-0.5 p-0.5">
          <div className="h-2 w-full bg-neutral-500 rounded-sm" />
          <div className="h-1.5 w-3/4 bg-neutral-400 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    render: () => (
      <div className="flex h-full items-center justify-center bg-neutral-200 rounded-sm">
        <div className="space-y-0.5 text-center">
          <div className="h-2 w-12 bg-neutral-500 rounded-sm mx-auto" />
          <div className="h-1 w-8 bg-neutral-400 rounded-sm mx-auto" />
        </div>
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
              "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 bg-white transition-all duration-150 cursor-pointer",
              selected === t.id
                ? "border-brand-500 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 bg-neutral-50 rounded">
              {t.render()}
            </div>
            <span className={cn("text-xs font-medium", selected === t.id ? "text-brand-700" : "text-neutral-600")}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        Thumbnail yonu gorseli — sectiginiz yon thumbnail uretiminde kullanilacaktir
      </p>
    </div>
  );
}
