import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { StandardVideosTable } from "../../components/standard-video/StandardVideosTable";
import { colors, typography, spacing } from "../../components/design-system/tokens";
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
      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.sm,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="sv-registry-workflow-note"
      >
        Standart video kayitlarini buradan goruntuleyebilir ve yonetebilirsiniz.
        Bir kayda tiklayarak detay sayfasina gidebilir, duzenleyebilir ve
        uretim durumunu takip edebilirsiniz.
      </p>

      <SectionShell flush testId="sv-registry-table-section">
        {isLoading && (
          <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>
            Yükleniyor...
          </p>
        )}
        {isError && (
          <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </p>
        )}
        {videos && videos.length === 0 && (
          <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
            <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz kayıt yok.</p>
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
