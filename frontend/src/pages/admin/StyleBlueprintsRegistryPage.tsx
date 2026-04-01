import { useState } from "react";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { StyleBlueprintsTable } from "../../components/style-blueprints/StyleBlueprintsTable";
import { StyleBlueprintDetailPanel } from "../../components/style-blueprints/StyleBlueprintDetailPanel";

export function StyleBlueprintsRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: blueprints, isLoading, isError, error } = useStyleBlueprintsList();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Style Blueprints Registry</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Admin tarafından yönetilen style blueprint kayıtları. Detay için bir blueprint seçin.
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

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <StyleBlueprintDetailPanel blueprintId={selectedId} />
        </div>
      </div>
    </div>
  );
}
