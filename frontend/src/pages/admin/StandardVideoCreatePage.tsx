import { useNavigate } from "react-router-dom";
import { StandardVideoForm } from "../../components/standard-video/StandardVideoForm";
import type { StandardVideoFormValues } from "../../components/standard-video/StandardVideoForm";
import { useCreateStandardVideo } from "../../hooks/useCreateStandardVideo";

export function StandardVideoCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateStandardVideo();

  function handleSubmit(values: StandardVideoFormValues) {
    const payload = {
      topic: values.topic,
      title: values.title || null,
      brief: values.brief || null,
      target_duration_seconds: values.target_duration_seconds !== ""
        ? Number(values.target_duration_seconds)
        : null,
      tone: values.tone || null,
      language: values.language || null,
      visual_direction: values.visual_direction || null,
      subtitle_style: values.subtitle_style || null,
    };
    mutate(payload, {
      onSuccess: (created) => {
        navigate(`/admin/standard-videos/${created.id}`);
      },
    });
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2" data-testid="sv-create-heading">
        Yeni Standard Video
      </h2>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="sv-create-subtitle">
        Konu ve temel bilgileri girin. Script, metadata ve uretim adimlari otomatik ilerler.
      </p>
      <StandardVideoForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        submitError={error ? error.message : null}
        onCancel={() => navigate("/admin/standard-videos")}
        submitLabel="Oluştur"
      />
    </div>
  );
}
