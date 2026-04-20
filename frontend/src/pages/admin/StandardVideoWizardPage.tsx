import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentCreationWizard, type WizardValues } from "../../components/wizard/ContentCreationWizard";
import { useToast } from "../../hooks/useToast";
import { api } from "../../api/client";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

async function createStandardVideo(values: WizardValues) {
  return api.post<{ id: string }>("/api/v1/modules/standard-video", {
    topic: values.topic.trim(),
    title: values.title.trim() || null,
    brief: values.brief.trim() || null,
    target_duration_seconds: values.target_duration_seconds ? Number(values.target_duration_seconds) : null,
    tone: values.tone.trim() || null,
    language: values.language.trim() || null,
    visual_direction: values.visual_direction.trim() || null,
    motion_level: values.motion_level.trim() || null,
    composition_direction: values.composition_direction.trim() || null,
    thumbnail_direction: values.thumbnail_direction.trim() || null,
    subtitle_style: values.subtitle_style || null,
    template_id: values.template_id || null,
    style_blueprint_id: values.style_blueprint_id || null,
    render_format: values.render_format || "landscape",
    karaoke_enabled: values.karaoke_enabled === "true",
    status: "draft",
  });
}

/**
 * Public entry point. Aurora surface override (admin.standard-video.wizard)
 * varsa onu kullanır; aksi halde legacy yüzeye düşer. Register.tsx bu sayfada
 * dokunulmadığı için override şu an boş döner — sonraki kayıt aşamasında
 * AuroraStandardVideoWizardPage otomatik devreye girer.
 */
export function StandardVideoWizardPage() {
  const Override = useSurfacePageOverride("admin.standard-video.wizard");
  if (Override) return <Override />;
  return <LegacyStandardVideoWizardPage />;
}

function LegacyStandardVideoWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const { mutate, isPending, error } = useMutation({
    mutationFn: createStandardVideo,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      toast.success("Standard video basariyla olusturuldu");
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
