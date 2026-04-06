import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/cn";

interface ColumnDef {
  key: string;
  label: string;
}

interface Props {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}

export function ColumnSelector({ columns, visible, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-colors",
          "border-border-subtle text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
        )}
        title="Sütunları düzenle"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="3" width="4" height="10" rx="1" />
          <rect x="6" y="3" width="4" height="10" rx="1" />
          <rect x="11" y="3" width="4" height="10" rx="1" />
        </svg>
        Sütunlar
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[160px] bg-neutral-0 border border-border-subtle rounded-md shadow-lg py-1">
          {columns.map((col) => {
            const checked = visible.has(col.key);
            return (
              <label
                key={col.key}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50 text-sm text-neutral-900 select-none"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(col.key)}
                  className="accent-brand-500 cursor-pointer"
                />
                {col.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
