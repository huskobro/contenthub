import { useNavigate, useParams } from "react-router-dom";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";
import { useSourceDetail } from "../../hooks/useSourceDetail";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

/**
 * Public entry point. Aurora surface override (admin.sources.detail)
 * geçerliyse onu kullanır; aksi halde minimal legacy yüzeye düşer.
 *
 * Legacy yüzeyde detay paneli bir Sheet içinde gösteriliyordu; tam-sayfa
 * detay yalnız Aurora override'ında bulunur. Override yokken bu sayfa
 * en azından temel kaynak bilgilerini ve registry'ye dönüş bağlantısı
 * sunar.
 */
export function SourceDetailPage() {
  const Override = useSurfacePageOverride("admin.sources.detail");
  if (Override) return <Override />;
  return <LegacySourceDetailPage />;
}

function LegacySourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: source, isLoading, isError, error } = useSourceDetail(id ?? null);

  return (
    <ReadOnlyGuard targetKey="panel:sources">
      <PageShell
        title={source?.name ?? "Kaynak Detayı"}
        subtitle="Aurora yüzeyi devre dışı — temel bilgiler"
        testId="source-detail"
        actions={
          <ActionButton variant="secondary" onClick={() => navigate("/admin/sources")}>
            Listeye dön
          </ActionButton>
        }
      >
        <SectionShell testId="source-detail-section">
          {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor…</p>}
          {isError && (
            <p className="text-error text-base p-4">
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {source && (
            <div className="p-4 space-y-2 text-sm">
              <div><strong>ID:</strong> {source.id}</div>
              <div><strong>Tür:</strong> {source.source_type}</div>
              <div><strong>Durum:</strong> {source.status}</div>
              {source.base_url && <div><strong>URL:</strong> {source.base_url}</div>}
              {source.feed_url && <div><strong>Feed:</strong> {source.feed_url}</div>}
              {source.notes && <div><strong>Notlar:</strong> {source.notes}</div>}
            </div>
          )}
        </SectionShell>
      </PageShell>
    </ReadOnlyGuard>
  );
}
