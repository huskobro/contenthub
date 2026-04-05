import { useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell } from "../../components/design-system/primitives";
import { colors, typography, spacing, radius } from "../../components/design-system/tokens";

export function VisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ReadOnlyGuard targetKey="panel:visibility">
    <PageShell title="Gorunurluk Kurallari" testId="visibility-registry">
      <p
        style={{
          margin: `${spacing[1]} 0 ${spacing[2]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
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
          margin: `0 0 ${spacing[4]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="visibility-registry-workflow-note"
      >
        Gorunurluk kontrol zinciri: Kural Tanimlama &rarr; Hedef Belirleme &rarr;
        Rol/Mod Kapsami &rarr; Gorünür/Salt-Okunur/Wizard Durumu. Bir kural
        sectiginizde detay panelinde governance durumunu gorebilirsiniz.
        Ayar duzeyinde governance icin Ayarlar sayfasini kullanin.
      </p>

      {isLoading && <p style={{ color: colors.neutral[600] }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: colors.error.base }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {rules && (
        <div style={{ display: "flex", gap: spacing[6], alignItems: "flex-start" }}>
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
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              background: colors.neutral[50],
            }}
          >
            <VisibilityRuleDetailPanel selectedId={selectedId} />
          </div>
        </div>
      )}
    </PageShell>
    </ReadOnlyGuard>
  );
}
