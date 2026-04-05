import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { NewsItemsTable } from "../../components/news-items/NewsItemsTable";
import { NewsItemDetailPanel } from "../../components/news-items/NewsItemDetailPanel";
import { PageShell } from "../../components/design-system/primitives";
import { colors, typography, spacing, radius } from "../../components/design-system/tokens";

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
      actions={
        <button
          onClick={() => navigate("/admin/news-items/new")}
          style={{
            padding: `${spacing[1]} ${spacing[4]}`,
            fontSize: typography.size.md,
            background: colors.brand[600],
            color: colors.neutral[0],
            border: "none",
            borderRadius: radius.sm,
            cursor: "pointer",
          }}
        >
          Yeni
        </button>
      }
    >
      <div style={{ display: "flex", gap: spacing[6] }}>
        <div style={{ flex: 1 }}>
          {isLoading && <p>Yükleniyor...</p>}
          {isError && <p style={{ color: colors.error.base }}>Hata: kayıtlar yüklenemedi.</p>}
          {!isLoading && !isError && items && items.length === 0 && (
            <p style={{ color: colors.neutral[500] }}>Henüz haber kaydı yok.</p>
          )}
          {items && items.length > 0 && (
            <NewsItemsTable
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
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
