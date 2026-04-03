import { useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";

export function VisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="visibility-registry-heading"
      >
        Gorunurluk Kurallari
      </h2>
      <p
        style={{
          margin: "0.25rem 0 0.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="visibility-registry-subtitle"
      >
        Sistemde tanimli gorunurluk kurallarinin listesi ve detaylari. Kurallar
        hangi alanlarin, widgetlarin ve wizard adimlarinin gorulecegini belirler.
      </p>
      <p
        style={{
          margin: "0 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="visibility-registry-workflow-note"
      >
        Gorunurluk kontrol zinciri: Kural Tanimlama → Hedef Belirleme →
        Rol/Mod Kapsami → Gorünür/Salt-Okunur/Wizard Durumu. Bir kural
        sectiginizde detay panelinde governance durumunu gorebilirsiniz.
        Ayar duzeyinde governance icin Ayarlar sayfasini kullanin.
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
