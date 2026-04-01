import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useStandardVideoDetail,
  useStandardVideoScript,
  useStandardVideoMetadata,
} from "../../hooks/useStandardVideoDetail";
import { StandardVideoOverviewPanel } from "../../components/standard-video/StandardVideoOverviewPanel";
import { StandardVideoScriptPanel } from "../../components/standard-video/StandardVideoScriptPanel";
import { StandardVideoArtifactsPanel } from "../../components/standard-video/StandardVideoArtifactsPanel";
import { StandardVideoForm } from "../../components/standard-video/StandardVideoForm";
import type { StandardVideoFormValues } from "../../components/standard-video/StandardVideoForm";
import { useUpdateStandardVideo } from "../../hooks/useUpdateStandardVideo";
import { useCreateStandardVideoScript } from "../../hooks/useCreateStandardVideoScript";
import { useUpdateStandardVideoScript } from "../../hooks/useUpdateStandardVideoScript";

export function StandardVideoDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [editMode, setEditMode] = useState(false);

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

  const { mutate: updateVideo, isPending: isUpdating, error: updateError } = useUpdateStandardVideo(itemId ?? "");
  const { mutate: createScript, isPending: isCreatingScript, error: createScriptError } = useCreateStandardVideoScript(itemId ?? "");
  const { mutate: updateScript, isPending: isUpdatingScript, error: updateScriptError } = useUpdateStandardVideoScript(itemId ?? "");

  function handleEditSubmit(values: StandardVideoFormValues) {
    const payload = {
      topic: values.topic || null,
      title: values.title || null,
      brief: values.brief || null,
      target_duration_seconds: values.target_duration_seconds !== ""
        ? Number(values.target_duration_seconds)
        : null,
      tone: values.tone || null,
      language: values.language || null,
      visual_direction: values.visual_direction || null,
      subtitle_style: values.subtitle_style || null,
      status: values.status || null,
    };
    updateVideo(payload, {
      onSuccess: () => {
        setEditMode(false);
      },
    });
  }

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

      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>Standard Video Detayı</h2>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{
              fontSize: "0.8125rem",
              padding: "0.25rem 0.75rem",
              background: "transparent",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Düzenle
          </button>
        )}
      </div>
      <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.875rem" }}>
        {video.topic} — <code style={{ fontSize: "0.8125rem" }}>{video.id}</code>
      </p>

      {editMode ? (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Kaydı Düzenle</h3>
          <StandardVideoForm
            initial={video}
            onSubmit={handleEditSubmit}
            isSubmitting={isUpdating}
            submitError={updateError ? updateError.message : null}
            onCancel={() => setEditMode(false)}
            submitLabel="Güncelle"
          />
        </div>
      ) : (
        <>
          <StandardVideoOverviewPanel video={video} />

          <StandardVideoScriptPanel
            videoId={itemId ?? ""}
            isLoading={scriptLoading}
            isError={scriptError}
            script={script ?? null}
            onCreate={(payload) => createScript(payload)}
            onUpdate={(payload) => updateScript(payload)}
            isCreating={isCreatingScript}
            isUpdating={isUpdatingScript}
            createError={createScriptError ? createScriptError.message : null}
            updateError={updateScriptError ? updateScriptError.message : null}
          />

          <StandardVideoArtifactsPanel
            scriptLoading={scriptLoading}
            scriptError={scriptError}
            script={script}
            metadataLoading={metadataLoading}
            metadataError={metadataError}
            metadata={metadata}
          />
        </>
      )}
    </div>
  );
}
