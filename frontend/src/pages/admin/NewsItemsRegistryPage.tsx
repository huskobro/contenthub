import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { NewsItemsTable } from "../../components/news-items/NewsItemsTable";
import { NewsItemDetailPanel } from "../../components/news-items/NewsItemDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

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
      <div className="flex gap-6">
        <div className="flex-1">
          <SectionShell testId="news-items-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && <p className="text-error text-base p-4">Hata: kayıtlar yüklenemedi.</p>}
            {!isLoading && !isError && items && items.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz haber kaydı yok.</p>
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
          <div className="w-[380px] border-l border-border pl-6">
            <NewsItemDetailPanel selectedId={selectedId} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
