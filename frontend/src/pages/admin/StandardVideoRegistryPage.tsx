import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { StandardVideosTable } from "../../components/standard-video/StandardVideosTable";

export function StandardVideoRegistryPage() {
  const { data: videos, isLoading, isError, error } = useStandardVideosList();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }} data-testid="sv-registry-heading">Standart Video Kayitlari</h2>
        <button
          onClick={() => navigate("/admin/standard-videos/new")}
          style={{
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + Yeni Standard Video
        </button>
      </div>
      <p
        style={{
          margin: "0.25rem 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="sv-registry-workflow-note"
      >
        Standart video kayitlarini buradan goruntuleyebilir ve yonetebilirsiniz.
        Bir kayda tiklayarak detay sayfasina gidebilir, duzenleyebilir ve
        uretim durumunu takip edebilirsiniz.
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
