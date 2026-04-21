import { cn } from "../../lib/cn";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface TableFilterBarProps {
  groups: FilterGroup[];
  active: Record<string, string | null>;
  onChange: (key: string, value: string | null) => void;
}

export function TableFilterBar({ groups, active, onChange }: TableFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-2 mb-2">
      {groups.map((group) => (
        <div key={group.key} className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 shrink-0">{group.label}:</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => onChange(group.key, null)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs border transition-colors duration-fast cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2",
                active[group.key] == null
                  ? "bg-brand-500 border-brand-500 text-white"
                  : "bg-transparent border-border-default text-neutral-600 hover:border-neutral-500 hover:text-neutral-800"
              )}
            >
              Tümü
            </button>
            {group.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(group.key, active[group.key] === opt.value ? null : opt.value)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs border transition-colors duration-fast cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2",
                  active[group.key] === opt.value
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "bg-transparent border-border-default text-neutral-600 hover:border-neutral-500 hover:text-neutral-800"
                )}
              >
                {opt.label}
                {opt.count !== undefined && (
                  <span className="ml-1 opacity-60">({opt.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
