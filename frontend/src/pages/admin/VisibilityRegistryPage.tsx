import { useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";
import { VisibilityRuleCreateForm } from "../../components/visibility/VisibilityRuleCreateForm";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { Sheet } from "../../components/design-system/Sheet";

export function VisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <ReadOnlyGuard targetKey="panel:visibility">
    <PageShell title="Görünürlük Kuralları" testId="visibility-registry">
      <div className="flex items-center justify-between mb-2">
        <p className="m-0 text-sm text-neutral-500" data-testid="visibility-registry-subtitle">
          Hangi panellerin, alanların ve wizard adımlarının kime, hangi modülde gösterileceğini yönetin.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-sm bg-brand-600 hover:bg-brand-700 text-neutral-0 font-medium py-1.5 px-4 rounded-md cursor-pointer border-0 transition-colors shrink-0 ml-4"
          data-testid="visibility-create-btn"
        >
          + Yeni Kural
        </button>
      </div>
      <p className="m-0 mb-4 text-xs text-neutral-400" data-testid="visibility-registry-workflow-note">
        Kural Tanımla → Hedef Belirle → Kapsam (Modül / Rol) → Görünürlük & Salt-Okunur & Wizard davranışı
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
                <p className="m-0 text-md">Henüz kayıtlı görünürlük kuralı yok.</p>
                <p className="m-0 mt-2 text-sm">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="text-brand-600 underline bg-transparent border-0 cursor-pointer"
                  >
                    İlk kuralı ekleyin
                  </button>
                </p>
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

      {/* Kural oluşturma sheet */}
      <Sheet
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Yeni Görünürlük Kuralı"
      >
        <VisibilityRuleCreateForm
          onSuccess={(id) => {
            setShowCreateForm(false);
            setSelectedId(id);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </Sheet>
    </PageShell>
    </ReadOnlyGuard>
  );
}
