import { useState } from "react";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { UsedNewsTable } from "../../components/used-news/UsedNewsTable";
import { UsedNewsDetailPanel } from "../../components/used-news/UsedNewsDetailPanel";

export function UsedNewsRegistryPage() {
  const { data: records, isLoading, isError } = useUsedNewsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Used News Registry</h2>
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
