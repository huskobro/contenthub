import { useState } from "react";
import { useSettingsList } from "../../hooks/useSettingsList";
import { SettingsTable } from "../../components/settings/SettingsTable";
import { SettingDetailPanel } from "../../components/settings/SettingDetailPanel";

export function SettingsRegistryPage() {
  const { data: settings, isLoading, isError, error } = useSettingsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Settings Registry</h2>
      <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.875rem" }}>
        Sistemde tanımlı ayarların listesi ve detayları.
      </p>

      {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {settings && (
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <SettingsTable
              settings={settings}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: "280px",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: "#fafbfc",
            }}
          >
            <SettingDetailPanel selectedId={selectedId} />
          </div>
        </div>
      )}
    </div>
  );
}
