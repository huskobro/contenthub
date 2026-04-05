import { useState } from "react";
import { useNewsItemsPickerList } from "../../hooks/useNewsItemsPickerList";
import { NewsItemPickerTable } from "./NewsItemPickerTable";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { colors, radius, typography } from "../design-system/tokens";

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
          fontSize: typography.size.base,
          background: open ? colors.info.light : colors.info.light,
          color: colors.info.dark,
          border: `1px solid ${colors.info.light}`,
          borderRadius: radius.sm,
          cursor: isAdding ? "not-allowed" : "pointer",
        }}
      >
        {open ? "▲ Haber seçmeyi kapat" : "▼ Haberden seç"}
      </button>

      {addError && (
        <div style={{ color: colors.error.base, fontSize: typography.size.base, marginTop: "0.25rem" }}>{addError}</div>
      )}

      {open && (
        <div style={{
          marginTop: "0.5rem",
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.sm,
          padding: "0.75rem",
          background: colors.neutral[0],
          maxHeight: "300px",
          overflowY: "auto",
        }}>
          {isLoading && <p style={{ color: colors.neutral[600], margin: 0, fontSize: typography.size.md }}>Haberler yükleniyor...</p>}
          {isError && <p style={{ color: colors.error.base, margin: 0, fontSize: typography.size.md }}>Haberler yüklenemedi.</p>}
          {items && <NewsItemPickerTable items={items} onSelect={handleSelect} />}
        </div>
      )}
    </div>
  );
}
