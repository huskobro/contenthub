import { useMemo, useState } from "react";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import { VisibilityRulesTable } from "../../components/visibility/VisibilityRulesTable";
import { VisibilityRuleDetailPanel } from "../../components/visibility/VisibilityRuleDetailPanel";
import { VisibilityRuleCreateForm } from "../../components/visibility/VisibilityRuleCreateForm";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { Sheet } from "../../components/design-system/Sheet";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Test fixture detection (F9 — critical UX fix pack).
 *
 * Historical M22/M23 test runs left synthetic rules in the DB whose
 * target_key carries a `test:` prefix. These pollute the production
 * Visibility page (the auditor found 137+ fixture rows and zero real
 * rules). We filter them out by default so admins see a clean surface,
 * but expose a toggle so operators who need the fixtures for debugging
 * can opt back in without losing data.
 *
 * We match conservatively on prefix only — real rule keys use
 * `panel:*`, `widget:*`, `field:*`, `wizard_step:*`, etc. — never
 * `test:`. If this convention ever changes the filter will need
 * revisiting, but no silent data deletion happens.
 */
function isTestFixtureRule(targetKey: string | null | undefined): boolean {
  if (!targetKey) return false;
  return targetKey.startsWith("test:");
}

/**
 * Public entry point. Aurora surface override (admin.visibility.registry)
 * geçerliyse onu kullanır; aksi halde legacy yüzeye düşer.
 */
export function VisibilityRegistryPage() {
  const Override = useSurfacePageOverride("admin.visibility.registry");
  if (Override) return <Override />;
  return <LegacyVisibilityRegistryPage />;
}

function LegacyVisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTestFixtures, setShowTestFixtures] = useState(false);

  const { visibleRules, testFixtureCount } = useMemo(() => {
    if (!rules) return { visibleRules: undefined, testFixtureCount: 0 };
    const fixtures = rules.filter((r) => isTestFixtureRule(r.target_key));
    const visible = showTestFixtures
      ? rules
      : rules.filter((r) => !isTestFixtureRule(r.target_key));
    return { visibleRules: visible, testFixtureCount: fixtures.length };
  }, [rules, showTestFixtures]);

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

      {testFixtureCount > 0 && (
        <div
          className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-md border border-border-subtle bg-neutral-50"
          data-testid="visibility-test-fixture-toggle"
        >
          <div className="text-xs text-neutral-600">
            <strong className="text-neutral-800">{testFixtureCount}</strong> adet test fixture (
            <code className="font-mono text-[11px]">test:*</code>) varsayılan olarak gizlendi.
            Bu kayıtlar M22/M23 testlerinden kalan sentetik verilerdir; ürün kuralları değildir.
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showTestFixtures}
              onChange={(e) => setShowTestFixtures(e.target.checked)}
              className="cursor-pointer"
              data-testid="visibility-show-test-fixtures"
            />
            Test verisini göster
          </label>
        </div>
      )}

      <div className="flex gap-6 items-start">
        <div className="flex-[2] min-w-0">
          <SectionShell testId="visibility-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {!isLoading && !isError && visibleRules && visibleRules.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">
                  {testFixtureCount > 0 && !showTestFixtures
                    ? "Henüz ürün kuralı yok (test fixture'lar gizli)."
                    : "Henüz kayıtlı görünürlük kuralı yok."}
                </p>
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
            {visibleRules && visibleRules.length > 0 && (
              <VisibilityRulesTable
                rules={visibleRules}
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
