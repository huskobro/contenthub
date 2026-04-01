import { useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";

export function VisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Visibility Registry</h2>
      <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.875rem" }}>
        Sistemde tanımlı görünürlük kurallarının listesi ve detayları.
      </p>

      {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {rules && (
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <VisibilityRulesTable
              rules={rules}
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
            <VisibilityRuleDetailPanel selectedId={selectedId} />
          </div>
        </div>
      )}
    </div>
  );
}
