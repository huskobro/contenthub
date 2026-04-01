import { useState } from "react";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { TemplatesTable } from "../../components/templates/TemplatesTable";
import { TemplateDetailPanel } from "../../components/templates/TemplateDetailPanel";

export function TemplatesRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: templates, isLoading, isError, error } = useTemplatesList();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Templates Registry</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Sistemde kayıtlı template'lerin listesi. Detay için bir template seçin.
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
          {templates && templates.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz template yok.</p>
          )}
          {templates && templates.length > 0 && (
            <TemplatesTable
              templates={templates}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <TemplateDetailPanel templateId={selectedId} />
        </div>
      </div>
    </div>
  );
}
