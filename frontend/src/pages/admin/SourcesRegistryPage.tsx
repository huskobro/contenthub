import { useState } from "react";
import { useSourcesList } from "../../hooks/useSourcesList";
import { SourcesTable } from "../../components/sources/SourcesTable";
import { SourceDetailPanel } from "../../components/sources/SourceDetailPanel";

export function SourcesRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: sources, isLoading, isError, error } = useSourcesList();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Sources Registry</h2>
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
