import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { NewsItemsTable } from "../../components/news-items/NewsItemsTable";
import { NewsItemDetailPanel } from "../../components/news-items/NewsItemDetailPanel";

export function NewsItemsRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { selectedId?: string } | null)?.selectedId ?? null
  );
  const { data: items, isLoading, isError } = useNewsItemsList();

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>News Items</h2>
          <button
            onClick={() => navigate("/admin/news-items/new")}
            style={{
              padding: "0.375rem 1rem",
              fontSize: "0.875rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Yeni
          </button>
        </div>

        {isLoading && <p>Yükleniyor...</p>}
        {isError && <p style={{ color: "red" }}>Hata: kayıtlar yüklenemedi.</p>}
        {!isLoading && !isError && items && items.length === 0 && (
          <p style={{ color: "#94a3b8" }}>Henüz haber kaydı yok.</p>
        )}
        {items && items.length > 0 && (
          <NewsItemsTable
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      {selectedId && (
        <div style={{ width: "380px", borderLeft: "1px solid #e2e8f0", paddingLeft: "1.5rem" }}>
          <NewsItemDetailPanel selectedId={selectedId} />
        </div>
      )}
    </div>
  );
}
