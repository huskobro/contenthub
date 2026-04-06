import { useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell, SectionShell } from "../../components/design-system/primitives";

export function VisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ReadOnlyGuard targetKey="panel:visibility">
    <PageShell title="Gorunurluk Kurallari" testId="visibility-registry">
      <p className="mt-1 mb-2 text-base text-neutral-500 leading-normal max-w-[640px]" data-testid="visibility-registry-subtitle">
        Sistemde tanimli gorunurluk kurallarinin listesi ve detaylari. Kurallar
        hangi alanlarin, widgetlarin ve wizard adimlarinin gorulecegini belirler.
      </p>
      <p className="m-0 mb-4 text-base text-neutral-500 leading-normal max-w-[640px]" data-testid="visibility-registry-workflow-note">
        Gorunurluk kontrol zinciri: Kural Tanimlama &rarr; Hedef Belirleme &rarr;
        Rol/Mod Kapsami &rarr; Görünür/Salt-Okunur/Wizard Durumu. Bir kural
        sectiginizde detay panelinde governance durumunu gorebilirsiniz.
        Ayar duzeyinde governance icin Ayarlar sayfasini kullanin.
      </p>

      <div className="flex gap-6 items-start">
        <div className="flex-[2] min-w-0">
          <SectionShell testId="visibility-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {!isLoading && !isError && rules && rules.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz kayıtlı visibility rule yok.</p>
              </div>
            )}
            {rules && rules.length > 0 && (
              <VisibilityRulesTable
                rules={rules}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>
        <div className="flex-1 min-w-[280px] border border-border rounded-md bg-neutral-50">
          <VisibilityRuleDetailPanel selectedId={selectedId} />
        </div>
      </div>
    </PageShell>
    </ReadOnlyGuard>
  );
}
