import { useNavigate, useParams } from "react-router-dom";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";
import { useNewsItemDetail } from "../../hooks/useNewsItemDetail";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

/**
 * Public entry point. Aurora surface override (admin.news-items.detail)
 * geçerliyse onu kullanır; aksi halde minimal legacy yüzeye düşer.
 *
 * Legacy yüzey ilk versiyonda yoktu (haber öğesi listesinden detay paneli
 * tıklamak Aurora override'ı tetikliyordu). Override yokken bu sayfa
 * en azından temel haber bilgilerini ve registry'ye dönüş bağlantısı
 * sunar.
 */
export function NewsItemDetailPage() {
  const Override = useSurfacePageOverride("admin.news-items.detail");
  if (Override) return <Override />;
  return <LegacyNewsItemDetailPage />;
}

function LegacyNewsItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, isError, error } = useNewsItemDetail(id ?? null);

  return (
    <ReadOnlyGuard targetKey="panel:news-items">
      <PageShell
        title={item?.title ?? "Haber Detayı"}
        subtitle="Aurora yüzeyi devre dışı — temel bilgiler"
        testId="news-item-detail"
        actions={
          <ActionButton variant="secondary" onClick={() => navigate("/admin/news-items")}>
            Listeye dön
          </ActionButton>
        }
      >
        <SectionShell testId="news-item-detail-section">
          {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor…</p>}
          {isError && (
            <p className="text-error text-base p-4">
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {item && (
            <div className="p-4 space-y-2 text-sm">
              <div><strong>ID:</strong> {item.id}</div>
              <div><strong>Kaynak ID:</strong> {item.source_id}</div>
              {item.summary && <div><strong>Özet:</strong> {item.summary}</div>}
              {item.url && (
                <div>
                  <strong>URL:</strong>{" "}
                  <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                </div>
              )}
            </div>
          )}
        </SectionShell>
      </PageShell>
    </ReadOnlyGuard>
  );
}
