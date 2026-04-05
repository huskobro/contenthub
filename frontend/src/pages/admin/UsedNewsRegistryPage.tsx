import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { UsedNewsTable } from "../../components/used-news/UsedNewsTable";
import { UsedNewsDetailPanel } from "../../components/used-news/UsedNewsDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { colors, typography, spacing } from "../../components/design-system/tokens";

export function UsedNewsRegistryPage() {
  const { data: records, isLoading, isError } = useUsedNewsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      title="Used News Registry"
      testId="used-news-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/used-news/new")}>
          + Yeni
        </ActionButton>
      }
    >
      <div style={{ display: "flex", gap: spacing[6] }}>
        <div style={{ flex: 1 }}>
          <SectionShell testId="used-news-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>Hata: kayıtlar yüklenemedi.</p>}
            {!isLoading && !isError && records && records.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz kullanılmış haber kaydı yok.</p>
              </div>
            )}
            {records && records.length > 0 && (
              <UsedNewsTable
                records={records}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        {selectedId && (
          <div style={{ width: "360px", borderLeft: `1px solid ${colors.border.default}`, paddingLeft: spacing[6] }}>
            <UsedNewsDetailPanel selectedId={selectedId} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
