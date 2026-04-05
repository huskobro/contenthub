import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { NewsItemsTable } from "../../components/news-items/NewsItemsTable";
import { NewsItemDetailPanel } from "../../components/news-items/NewsItemDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { colors, typography, spacing } from "../../components/design-system/tokens";

export function NewsItemsRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { selectedId?: string } | null)?.selectedId ?? null
  );
  const { data: items, isLoading, isError } = useNewsItemsList();

  return (
    <PageShell
      title="News Items"
      testId="news-items-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/news-items/new")}>
          Yeni
        </ActionButton>
      }
    >
      <div style={{ display: "flex", gap: spacing[6] }}>
        <div style={{ flex: 1 }}>
          <SectionShell testId="news-items-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>Hata: kayıtlar yüklenemedi.</p>}
            {!isLoading && !isError && items && items.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz haber kaydı yok.</p>
              </div>
            )}
            {items && items.length > 0 && (
              <NewsItemsTable
                items={items}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        {selectedId && (
          <div style={{ width: "380px", borderLeft: `1px solid ${colors.border.default}`, paddingLeft: spacing[6] }}>
            <NewsItemDetailPanel selectedId={selectedId} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
