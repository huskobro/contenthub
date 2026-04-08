import { cn } from "../../../lib/cn";

interface StatusGridItem {
  name: string;
  status: "healthy" | "warning" | "error" | "unknown";
  detail?: string;
}

interface StatusGridProps {
  items: StatusGridItem[];
  columns?: number;
  emptyMessage?: string;
  testId?: string;
}

const STATUS_STYLES: Record<
  StatusGridItem["status"],
  { border: string; bg: string; dot: string }
> = {
  healthy: {
    border: "border-l-green-500",
    bg: "bg-green-50/30",
    dot: "bg-green-500",
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/30",
    dot: "bg-amber-500",
  },
  error: {
    border: "border-l-red-500",
    bg: "bg-red-50/30",
    dot: "bg-red-500",
  },
  unknown: {
    border: "border-l-neutral-300",
    bg: "bg-neutral-50/30",
    dot: "bg-neutral-300",
  },
};

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function StatusGrid({
  items,
  columns = 3,
  emptyMessage = "Durum verisi bulunamadi",
  testId = "status-grid",
}: StatusGridProps) {
  if (!items || items.length === 0) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center py-8 text-sm text-neutral-400"
      >
        {emptyMessage}
      </div>
    );
  }

  const gridCols = GRID_COLS[columns] ?? "grid-cols-3";

  return (
    <div
      data-testid={testId}
      className={cn("grid gap-3", gridCols)}
    >
      {items.map((item) => {
        const styles = STATUS_STYLES[item.status];
        return (
          <div
            key={item.name}
            className={cn(
              "rounded-lg border-l-4 px-3 py-2.5",
              styles.border,
              styles.bg,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", styles.dot)}
              />
              <span className="truncate text-sm font-medium text-neutral-700">
                {item.name}
              </span>
            </div>
            {item.detail && (
              <p className="mt-1 pl-4 text-xs text-neutral-500">
                {item.detail}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
