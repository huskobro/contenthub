import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { UsedNewsTable } from "../../components/used-news/UsedNewsTable";
import { UsedNewsDetailPanel } from "../../components/used-news/UsedNewsDetailPanel";

export function UsedNewsRegistryPage() {
  const { data: records, isLoading, isError } = useUsedNewsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedId?: string } | null;
    if (state?.selectedId) {
      setSelectedId(state.selectedId);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Used News Registry</h2>
          <button
            onClick={() => navigate("/admin/used-news/new")}
            style={{
              padding: "0.375rem 1rem",
              fontSize: "0.875rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Yeni
          </button>
        </div>

        {isLoading && <p>Yükleniyor...</p>}
        {isError && <p style={{ color: "red" }}>Hata: kayıtlar yüklenemedi.</p>}
        {!isLoading && !isError && records && records.length === 0 && (
          <p style={{ color: "#94a3b8" }}>Henüz kullanılmış haber kaydı yok.</p>
        )}
        {records && records.length > 0 && (
          <UsedNewsTable
            records={records}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      {selectedId && (
        <div style={{ width: "360px", borderLeft: "1px solid #e2e8f0", paddingLeft: "1.5rem" }}>
          <UsedNewsDetailPanel selectedId={selectedId} />
        </div>
      )}
    </div>
  );
}
