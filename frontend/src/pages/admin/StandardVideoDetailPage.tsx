import { useParams, Link } from "react-router-dom";
import {
  useStandardVideoDetail,
  useStandardVideoScript,
  useStandardVideoMetadata,
} from "../../hooks/useStandardVideoDetail";
import { StandardVideoOverviewPanel } from "../../components/standard-video/StandardVideoOverviewPanel";
import { StandardVideoArtifactsPanel } from "../../components/standard-video/StandardVideoArtifactsPanel";

export function StandardVideoDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { data: video, isLoading, isError, error } = useStandardVideoDetail(itemId ?? null);
  const {
    data: script,
    isLoading: scriptLoading,
    isError: scriptError,
  } = useStandardVideoScript(itemId ?? null);
  const {
    data: metadata,
    isLoading: metadataLoading,
    isError: metadataError,
  } = useStandardVideoMetadata(itemId ?? null);

  if (isLoading) {
    return <p style={{ color: "#64748b" }}>Yükleniyor...</p>;
  }

  if (isError) {
    return (
      <p style={{ color: "#dc2626" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!video) {
    return <p style={{ color: "#64748b" }}>Kayıt bulunamadı.</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/standard-videos"
          style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}
        >
          ← Standard Video listesine dön
        </Link>
      </div>

      <h2 style={{ margin: "0 0 0.25rem" }}>Standard Video Detayı</h2>
      <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.875rem" }}>
        {video.topic} — <code style={{ fontSize: "0.8125rem" }}>{video.id}</code>
      </p>

      <StandardVideoOverviewPanel video={video} />
      <StandardVideoArtifactsPanel
        scriptLoading={scriptLoading}
        scriptError={scriptError}
        script={script}
        metadataLoading={metadataLoading}
        metadataError={metadataError}
        metadata={metadata}
      />
    </div>
  );
}
