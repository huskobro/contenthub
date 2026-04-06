import { cn } from "../../lib/cn";

export interface BulkAction {
  label: string;
  variant?: "danger" | "default";
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-500 bg-opacity-10 border border-brand-500 border-opacity-30 rounded-md mb-2">
      <span className="text-sm font-medium text-brand-400">
        {selectedCount} öğe seçildi
      </span>
      <div className="flex items-center gap-2 ml-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              "px-3 py-1 text-sm rounded-sm border transition-colors duration-fast cursor-pointer",
              action.variant === "danger"
                ? "text-error border-error border-opacity-50 hover:bg-error hover:bg-opacity-10 bg-transparent"
                : "text-neutral-300 border-neutral-600 hover:bg-neutral-700 bg-transparent"
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs text-neutral-500 hover:text-neutral-300 bg-transparent border-none cursor-pointer"
      >
        Seçimi temizle
      </button>
    </div>
  );
}
