import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useStandardVideoDetail,
  useStandardVideoScript,
  useStandardVideoMetadata,
} from "../../hooks/useStandardVideoDetail";
import { StandardVideoOverviewPanel } from "../../components/standard-video/StandardVideoOverviewPanel";
import { StandardVideoScriptPanel } from "../../components/standard-video/StandardVideoScriptPanel";
import { StandardVideoMetadataPanel } from "../../components/standard-video/StandardVideoMetadataPanel";
import { StandardVideoForm } from "../../components/standard-video/StandardVideoForm";
import type { StandardVideoFormValues } from "../../components/standard-video/StandardVideoForm";
import { useUpdateStandardVideo } from "../../hooks/useUpdateStandardVideo";
import { useCreateStandardVideoScript } from "../../hooks/useCreateStandardVideoScript";
import { useUpdateStandardVideoScript } from "../../hooks/useUpdateStandardVideoScript";
import { useCreateStandardVideoMetadata } from "../../hooks/useCreateStandardVideoMetadata";
import { useUpdateStandardVideoMetadata } from "../../hooks/useUpdateStandardVideoMetadata";
import {
  PageShell,
  SectionShell,
  ActionButton,
  Mono,
} from "../../components/design-system/primitives";

export function StandardVideoDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [editMode, setEditMode] = useState(false);

  const { data: video, isLoading, isError, error } = useStandardVideoDetail(itemId ?? null);
  const { data: script, isLoading: scriptLoading, isError: scriptError } = useStandardVideoScript(itemId ?? null);
  const { data: metadata, isLoading: metadataLoading, isError: metadataError } = useStandardVideoMetadata(itemId ?? null);

  const { mutate: updateVideo, isPending: isUpdating, error: updateError } = useUpdateStandardVideo(itemId ?? "");
  const { mutate: createScript, isPending: isCreatingScript, error: createScriptError } = useCreateStandardVideoScript(itemId ?? "");
  const { mutate: updateScript, isPending: isUpdatingScript, error: updateScriptError } = useUpdateStandardVideoScript(itemId ?? "");
  const { mutate: createMeta, isPending: isCreatingMeta, error: createMetaError } = useCreateStandardVideoMetadata(itemId ?? "");
  const { mutate: updateMeta, isPending: isUpdatingMeta, error: updateMetaError } = useUpdateStandardVideoMetadata(itemId ?? "");

  function handleEditSubmit(values: StandardVideoFormValues) {
    const payload = {
      topic: values.topic || null,
      title: values.title || null,
      brief: values.brief || null,
      target_duration_seconds: values.target_duration_seconds !== "" ? Number(values.target_duration_seconds) : null,
      tone: values.tone || null,
      language: values.language || null,
      visual_direction: values.visual_direction || null,
      subtitle_style: values.subtitle_style || null,
      status: values.status || null,
    };
    updateVideo(payload, { onSuccess: () => setEditMode(false) });
  }

  if (isLoading) return <p className="text-neutral-500 text-base">Yükleniyor...</p>;
  if (isError) return <p className="text-error text-base">Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}</p>;
  if (!video) return <p className="text-neutral-500 text-base">Kayit bulunamadi.</p>;

  return (
    <PageShell
      title="Standard Video Detayı"
      testId="sv-detail"
      breadcrumb={[
        { label: "Kutuphanaye don", to: "/admin/library" },
        { label: "Video listesi", to: "/admin/standard-videos" },
        { label: video.topic || "Detay" },
      ]}
      actions={!editMode ? <ActionButton variant="secondary" size="sm" onClick={() => setEditMode(true)}>Düzenle</ActionButton> : undefined}
    >
      <Link to="/admin/library" data-testid="sv-detail-library-link" className="inline-block mb-2 text-sm text-brand-600 no-underline">
        &larr; Kütüphaneye dön
      </Link>
      <p className="m-0 mb-2 text-neutral-600 text-sm">
        {video.topic} — <Mono>{video.id}</Mono>
      </p>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="sv-detail-workflow-chain">
        Kayit &rarr; Script &rarr; Metadata &rarr; TTS &rarr; Altyazi &rarr; Kompozisyon &rarr; Yayin
      </p>
      <div data-testid="sv-detail-manage-note" className="hidden">Kaydi duzenleyin veya klonlayin.</div>

      {editMode ? (
        <SectionShell title="Kaydi Düzenle" testId="sv-detail-edit-section">
          <StandardVideoForm
            initial={video}
            onSubmit={handleEditSubmit}
            isSubmitting={isUpdating}
            submitError={updateError ? (updateError instanceof Error ? updateError.message : "Bilinmeyen hata") : null}
            onCancel={() => setEditMode(false)}
            submitLabel="Güncelle"
          />
        </SectionShell>
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
            createError={createScriptError ? (createScriptError instanceof Error ? createScriptError.message : "Bilinmeyen hata") : null}
            updateError={updateScriptError ? (updateScriptError instanceof Error ? updateScriptError.message : "Bilinmeyen hata") : null}
          />
          <StandardVideoMetadataPanel
            videoId={itemId ?? ""}
            isLoading={metadataLoading}
            isError={metadataError}
            metadata={metadata ?? null}
            onCreate={(payload) => createMeta(payload)}
            onUpdate={(payload) => updateMeta(payload)}
            isCreating={isCreatingMeta}
            isUpdating={isUpdatingMeta}
            createError={createMetaError ? (createMetaError instanceof Error ? createMetaError.message : "Bilinmeyen hata") : null}
            updateError={updateMetaError ? (updateMetaError instanceof Error ? updateMetaError.message : "Bilinmeyen hata") : null}
          />
        </>
      )}
    </PageShell>
  );
}
