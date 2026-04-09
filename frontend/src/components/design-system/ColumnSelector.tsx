import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position dropdown relative to button via portal
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        dropRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
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

      {open && createPortal(
        <div
          ref={dropRef}
          role="listbox"
          className="fixed z-dropdown min-w-[160px] bg-neutral-0 border border-border-subtle rounded-md shadow-lg py-1"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-100%)" }}
        >
          {columns.map((col) => {
            const checked = visible.has(col.key);
            return (
              <label
                key={col.key}
                role="option"
                aria-selected={checked}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
