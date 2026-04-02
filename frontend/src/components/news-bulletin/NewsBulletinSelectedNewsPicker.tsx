import { useState } from "react";
import { useNewsItemsPickerList } from "../../hooks/useNewsItemsPickerList";
import { NewsItemPickerTable } from "./NewsItemPickerTable";
import type { NewsItemResponse } from "../../api/newsItemsApi";

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
    <div style={{ marginTop: "0.5rem" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={isAdding}
        style={{
          padding: "0.3rem 0.8rem",
          fontSize: "0.8125rem",
          background: open ? "#e0f2fe" : "#f0f9ff",
          color: "#0369a1",
          border: "1px solid #bae6fd",
          borderRadius: "4px",
          cursor: isAdding ? "not-allowed" : "pointer",
        }}
      >
        {open ? "▲ Haber seçmeyi kapat" : "▼ Haberden seç"}
      </button>

      {addError && (
        <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.25rem" }}>{addError}</div>
      )}

      {open && (
        <div style={{
          marginTop: "0.5rem",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "0.75rem",
          background: "#fff",
          maxHeight: "300px",
          overflowY: "auto",
        }}>
          {isLoading && <p style={{ color: "#64748b", margin: 0, fontSize: "0.875rem" }}>Haberler yükleniyor...</p>}
          {isError && <p style={{ color: "#dc2626", margin: 0, fontSize: "0.875rem" }}>Haberler yüklenemedi.</p>}
          {items && <NewsItemPickerTable items={items} onSelect={handleSelect} />}
        </div>
      )}
    </div>
  );
}
