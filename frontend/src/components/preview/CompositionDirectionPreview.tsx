import { cn } from "../../lib/cn";

interface CompositionDirectionPreviewProps {
  selected?: string;
  onSelect?: (direction: string) => void;
}

interface DirectionOption {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

const DIRECTIONS: DirectionOption[] = [
  {
    id: "classic",
    label: "Klasik",
    render: () => (
      <div className="flex flex-col h-full">
        <div className="flex-1 bg-neutral-300 rounded-sm" />
        <div className="mt-1 space-y-0.5">
          <div className="h-1.5 w-3/4 bg-neutral-400 rounded-sm" />
          <div className="h-1 w-1/2 bg-neutral-300 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "side_by_side",
    label: "Yan Yana",
    render: () => (
      <div className="flex h-full gap-1">
        <div className="flex-1 bg-neutral-300 rounded-sm" />
        <div className="flex-1 flex flex-col justify-center gap-0.5">
          <div className="h-1.5 w-full bg-neutral-400 rounded-sm" />
          <div className="h-1 w-3/4 bg-neutral-300 rounded-sm" />
          <div className="h-1 w-1/2 bg-neutral-300 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "fullscreen",
    label: "Tam Ekran",
    render: () => (
      <div className="relative h-full bg-neutral-300 rounded-sm">
        <div className="absolute inset-x-1 bottom-1 space-y-0.5">
          <div className="h-1.5 w-2/3 bg-white/80 rounded-sm" />
          <div className="h-1 w-1/3 bg-white/60 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "dynamic",
    label: "Dinamik",
    render: () => (
      <div className="flex flex-col h-full gap-0.5">
        <div className="flex flex-1 gap-0.5">
          <div className="flex-1 bg-neutral-300 rounded-sm" />
          <div className="w-1/3 bg-neutral-400 rounded-sm" />
        </div>
        <div className="flex flex-1 gap-0.5">
          <div className="w-1/3 bg-neutral-400 rounded-sm" />
          <div className="flex-1 bg-neutral-300 rounded-sm" />
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
              "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 bg-white transition-all duration-150 cursor-pointer",
              selected === d.id
                ? "border-brand-500 shadow-md ring-2 ring-brand-200"
                : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
            )}
          >
            <div className="w-full aspect-video p-1.5 bg-neutral-50 rounded">
              {d.render()}
            </div>
            <span className={cn("text-xs font-medium", selected === d.id ? "text-brand-700" : "text-neutral-600")}>
              {d.label}
            </span>
          </button>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-[10px] text-neutral-400 text-center italic">
        Duzenleme yonu gorseli — sectiginiz yon bultende kullanilacaktir
      </p>
    </div>
  );
}
