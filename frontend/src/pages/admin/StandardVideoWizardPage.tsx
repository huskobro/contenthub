import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentCreationWizard, type WizardValues } from "../../components/wizard/ContentCreationWizard";

async function createStandardVideo(values: WizardValues) {
  const res = await fetch("/api/v1/modules/standard-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: values.topic.trim(),
      title: values.title.trim() || null,
      brief: values.brief.trim() || null,
      target_duration_seconds: values.target_duration_seconds ? Number(values.target_duration_seconds) : null,
      tone: values.tone.trim() || null,
      language: values.language.trim() || null,
      visual_direction: values.visual_direction.trim() || null,
      subtitle_style: values.subtitle_style || null,
      template_id: values.template_id || null,
      style_blueprint_id: values.style_blueprint_id || null,
      status: "draft",
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Create failed: ${res.status}`);
  }
  return res.json();
}

export function StandardVideoWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: createStandardVideo,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      navigate(`/admin/standard-videos/${created.id}`);
    },
  });

  return (
    <ContentCreationWizard
      moduleType="standard_video"
      onSubmit={(values) => mutate(values)}
      isSubmitting={isPending}
      submitError={error instanceof Error ? error.message : null}
    />
  );
}
