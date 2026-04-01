import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSourcesList } from "../../hooks/useSourcesList";
import { SourcesTable } from "../../components/sources/SourcesTable";
import { SourceDetailPanel } from "../../components/sources/SourceDetailPanel";

export function SourcesRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const { data: sources, isLoading, isError, error } = useSourcesList();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>Sources Registry</h2>
        <button
          onClick={() => navigate("/admin/sources/new")}
          style={{
            padding: "0.375rem 0.875rem",
            background: "#1e40af",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          + Yeni Source
        </button>
      </div>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Haber kaynaklarının admin görünümü. Detay için bir source seçin.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* List area */}
        <div style={{ flex: 2, minWidth: 0 }}>
          {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
          {isError && (
            <p style={{ color: "#dc2626" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {sources && sources.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz source yok.</p>
          )}
          {sources && sources.length > 0 && (
            <SourcesTable
              sources={sources}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <SourceDetailPanel sourceId={selectedId} />
        </div>
      </div>
    </div>
  );
}
