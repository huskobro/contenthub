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
    <div style={{ padding: "1.5rem" }}>
      <h2
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}
        data-testid="sv-create-heading"
      >
        Yeni Standard Video
      </h2>
      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "0.875rem",
          color: "#64748b",
          lineHeight: 1.6,
          maxWidth: "640px",
        }}
        data-testid="sv-create-subtitle"
      >
        Video uretim akisinin baslangic noktasi. Konu ve temel bilgileri girerek
        yeni bir standart video kaydi olusturun. Olusturulan kayit uzerinden
        script, metadata ve uretim adimlari ilerleyecektir.
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
