import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { UsedNewsTable } from "../../components/used-news/UsedNewsTable";
import { UsedNewsDetailPanel } from "../../components/used-news/UsedNewsDetailPanel";
import { PageShell } from "../../components/design-system/primitives";
import { colors, typography, spacing, radius } from "../../components/design-system/tokens";

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
      actions={
        <button
          onClick={() => navigate("/admin/used-news/new")}
          style={{
            padding: `${spacing[1]} ${spacing[4]}`,
            fontSize: typography.size.md,
            background: colors.brand[600],
            color: colors.neutral[0],
            border: "none",
            borderRadius: radius.sm,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Yeni
        </button>
      }
    >
      <div style={{ display: "flex", gap: spacing[6] }}>
        <div style={{ flex: 1 }}>
          {isLoading && <p>Yükleniyor...</p>}
          {isError && <p style={{ color: colors.error.base }}>Hata: kayıtlar yüklenemedi.</p>}
          {!isLoading && !isError && records && records.length === 0 && (
            <p style={{ color: colors.neutral[500] }}>Henüz kullanılmış haber kaydı yok.</p>
          )}
          {records && records.length > 0 && (
            <UsedNewsTable
              records={records}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
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
