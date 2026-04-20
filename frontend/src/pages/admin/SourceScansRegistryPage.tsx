import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSourceScansList } from "../../hooks/useSourceScansList";
import { SourceScansTable } from "../../components/source-scans/SourceScansTable";
import { SourceScanDetailPanel } from "../../components/source-scans/SourceScanDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

export function SourceScansRegistryPage() {
  const Override = useSurfacePageOverride("admin.source-scans.registry");
  if (Override) return <Override />;
  return <LegacySourceScansRegistryPage />;
}

function LegacySourceScansRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: scans, isLoading, isError, error } = useSourceScansList();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedId?: string } | null;
    if (state?.selectedId) {
      setSelectedId(state.selectedId);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  return (
    <PageShell
      title="Source Scans Registry"
      subtitle="Kaynak tarama kayıtlarının admin görünümü. Detay için bir kayıt seçin."
      testId="source-scans-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/source-scans/new")}>
          + Yeni
        </ActionButton>
      }
    >
      <div className="flex gap-6 items-start">
        <div className="flex-[2] min-w-0">
          <SectionShell testId="source-scans-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {scans && scans.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz scan kaydı yok.</p>
              </div>
            )}
            {scans && scans.length > 0 && (
              <SourceScansTable
                scans={scans}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        <div className="flex-1 min-w-[260px]">
          <SourceScanDetailPanel scanId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
