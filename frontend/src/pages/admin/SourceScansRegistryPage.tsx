import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSourceScansList } from "../../hooks/useSourceScansList";
import { SourceScansTable } from "../../components/source-scans/SourceScansTable";
import { SourceScanDetailPanel } from "../../components/source-scans/SourceScanDetailPanel";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

export function SourceScansRegistryPage() {
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
      <div style={{ display: "flex", gap: spacing[6], alignItems: "flex-start" }}>
        {/* List area */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <SectionShell testId="source-scans-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && (
              <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {scans && scans.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz scan kaydı yok.</p>
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

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <SourceScanDetailPanel scanId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
