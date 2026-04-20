import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { StandardVideosTable } from "../../components/standard-video/StandardVideosTable";
import {
  PageShell,
  SectionShell,
  ActionButton,
} from "../../components/design-system/primitives";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (admin.standard-video.registry)
 * geçerliyse onu kullanır; aksi halde legacy yüzeye düşer.
 */
export function StandardVideoRegistryPage() {
  const Override = useSurfacePageOverride("admin.standard-video.registry");
  if (Override) return <Override />;
  return <LegacyStandardVideoRegistryPage />;
}

function LegacyStandardVideoRegistryPage() {
  const { data: videos, isLoading, isError, error } = useStandardVideosList();
  const navigate = useNavigate();

  return (
    <PageShell
      title="Standart Video Kayitlari"
      testId="sv-registry"
      actions={
        <div className="flex gap-2">
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => navigate("/admin/standard-videos/wizard")}
          >
            🧙 Wizard ile Olustur
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            onClick={() => navigate("/admin/standard-videos/new")}
          >
            + Yeni Standard Video
          </ActionButton>
        </div>
      }
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="sv-registry-workflow-note">
        Video kayitlarini goruntuleyin. Kayda tiklayarak detay ve uretim durumunu takip edin.
      </p>

      <SectionShell flush testId="sv-registry-table-section">
        {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
        {isError && (
          <p className="text-error text-base p-4">
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </p>
        )}
        {videos && videos.length === 0 && (
          <div className="text-center py-8 px-4 text-neutral-500">
            <p className="m-0 text-md">Henüz kayıt yok.</p>
          </div>
        )}
        {videos && videos.length > 0 && (
          <StandardVideosTable
            videos={videos}
            selectedId={null}
            onSelect={(id) => navigate(`/admin/standard-videos/${id}`)}
          />
        )}
      </SectionShell>
    </PageShell>
  );
}
