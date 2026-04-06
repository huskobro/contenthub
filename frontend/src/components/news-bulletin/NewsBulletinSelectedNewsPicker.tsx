import { useState } from "react";
import { useNewsItemsPickerList } from "../../hooks/useNewsItemsPickerList";
import { NewsItemPickerTable } from "./NewsItemPickerTable";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { cn } from "../../lib/cn";

interface Props {
  onSelect: (item: NewsItemResponse) => void;
  isAdding: boolean;
  addError: string | null;
}

export function NewsBulletinSelectedNewsPicker({ onSelect, isAdding, addError }: Props) {
  const [open, setOpen] = useState(false);
  const { data: items, isLoading, isError } = useNewsItemsPickerList();

  function handleSelect(item: NewsItemResponse) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={isAdding}
        className={cn(
          "px-3 py-1 text-base bg-info-light text-info-dark border border-info-light rounded-sm",
          isAdding ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        {open ? "▲ Haber seçmeyi kapat" : "▼ Haberden seç"}
      </button>

      {addError && (
        <div className="text-error text-base mt-1">{addError}</div>
      )}

      {open && (
        <div className="mt-2 border border-border-subtle rounded-sm p-3 bg-neutral-0 max-h-[300px] overflow-y-auto">
          {isLoading && <p className="text-neutral-600 m-0 text-md">Haberler yükleniyor...</p>}
          {isError && <p className="text-error m-0 text-md">Haberler yüklenemedi.</p>}
          {items && <NewsItemPickerTable items={items} onSelect={handleSelect} />}
        </div>
      )}
    </div>
  );
}
