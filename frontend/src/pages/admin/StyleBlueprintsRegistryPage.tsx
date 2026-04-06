import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { StyleBlueprintsTable } from "../../components/style-blueprints/StyleBlueprintsTable";
import { StyleBlueprintDetailPanel } from "../../components/style-blueprints/StyleBlueprintDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

export function StyleBlueprintsRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { selectedId?: string } | null)?.selectedId ?? null
  );
  const { data: blueprints, isLoading, isError, error } = useStyleBlueprintsList();

  return (
    <PageShell
      title="Style Blueprint Kayitlari"
      testId="sb-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/style-blueprints/new")}>
          + Yeni Blueprint Olustur
        </ActionButton>
      }
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="sb-registry-workflow-note">
        Gorsel kimlik, hareket, layout ve altyazi kurallari. Blueprint secerek detay gorun.
      </p>

      <div className="flex gap-6 items-start">
        <div className="flex-[2] min-w-0">
          <SectionShell testId="sb-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {blueprints && blueprints.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz style blueprint yok.</p>
              </div>
            )}
            {blueprints && blueprints.length > 0 && (
              <StyleBlueprintsTable
                blueprints={blueprints}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        <div className="flex-1 min-w-[260px]">
          <StyleBlueprintDetailPanel blueprintId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
