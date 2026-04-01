import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { StandardVideosTable } from "../../components/standard-video/StandardVideosTable";

export function StandardVideoRegistryPage() {
  const { data: videos, isLoading, isError, error } = useStandardVideosList();
  const navigate = useNavigate();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Standard Video Registry</h2>
      <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.875rem" }}>
        Sistemde kayıtlı standard video kayıtlarının listesi.
      </p>

      {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}
      {videos && videos.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz kayıt yok.</p>
      )}
      {videos && videos.length > 0 && (
        <StandardVideosTable
          videos={videos}
          selectedId={null}
          onSelect={(id) => navigate(`/admin/standard-videos/${id}`)}
        />
      )}
    </div>
  );
}
