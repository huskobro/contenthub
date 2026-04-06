import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { StandardVideosTable } from "../../components/standard-video/StandardVideosTable";
import {
  PageShell,
  SectionShell,
  ActionButton,
} from "../../components/design-system/primitives";

export function StandardVideoRegistryPage() {
  const { data: videos, isLoading, isError, error } = useStandardVideosList();
  const navigate = useNavigate();

  return (
    <PageShell
      title="Standart Video Kayitlari"
      testId="sv-registry"
      actions={
        <ActionButton
          variant="primary"
          size="sm"
          onClick={() => navigate("/admin/standard-videos/new")}
        >
          + Yeni Standard Video
        </ActionButton>
      }
    >
      <p className="m-0 mb-5 text-sm text-neutral-500 leading-normal max-w-[640px]" data-testid="sv-registry-workflow-note">
        Standart video kayitlarini buradan goruntuleyebilir ve yonetebilirsiniz.
        Bir kayda tiklayarak detay sayfasina gidebilir, duzenleyebilir ve
        uretim durumunu takip edebilirsiniz.
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
