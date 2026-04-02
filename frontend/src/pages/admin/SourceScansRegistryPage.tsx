import { useState } from "react";
import { useSourceScansList } from "../../hooks/useSourceScansList";
import { SourceScansTable } from "../../components/source-scans/SourceScansTable";
import { SourceScanDetailPanel } from "../../components/source-scans/SourceScanDetailPanel";

export function SourceScansRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: scans, isLoading, isError, error } = useSourceScansList();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Source Scans Registry</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Kaynak tarama kayıtlarının admin görünümü. Detay için bir kayıt seçin.
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
          {scans && scans.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz scan kaydı yok.</p>
          )}
          {scans && scans.length > 0 && (
            <SourceScansTable
              scans={scans}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <SourceScanDetailPanel scanId={selectedId} />
        </div>
      </div>
    </div>
  );
}
