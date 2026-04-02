import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { StyleBlueprintsTable } from "../../components/style-blueprints/StyleBlueprintsTable";
import { StyleBlueprintDetailPanel } from "../../components/style-blueprints/StyleBlueprintDetailPanel";

export function StyleBlueprintsRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { selectedId?: string } | null)?.selectedId ?? null
  );
  const { data: blueprints, isLoading, isError, error } = useStyleBlueprintsList();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>Style Blueprints Registry</h2>
        <button
          onClick={() => navigate("/admin/style-blueprints/new")}
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
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Admin tarafından yönetilen style blueprint kayıtları. Detay için bir blueprint seçin.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        <div style={{ flex: 2, minWidth: 0 }}>
          {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
          {isError && (
            <p style={{ color: "#dc2626" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {blueprints && blueprints.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz style blueprint yok.</p>
          )}
          {blueprints && blueprints.length > 0 && (
            <StyleBlueprintsTable
              blueprints={blueprints}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: "260px" }}>
          <StyleBlueprintDetailPanel blueprintId={selectedId} />
        </div>
      </div>
    </div>
  );
}
