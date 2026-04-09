/**
 * CreateVideoWizardPage — Faz 5F: User-facing video creation wizard.
 *
 * Flow: ChannelProfile (Step 0) → ContentProject → Basics → Style → Template → Review → Submit
 *
 * Replaces admin-only StandardVideoWizardPage for regular users.
 * Creates ContentProject first, then creates StandardVideo record linked to it.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../hooks/useToast";
import { WizardShell, type WizardStep } from "../../components/wizard/WizardShell";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { SubtitleStylePicker } from "../../components/standard-video/SubtitleStylePicker";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { MotionLevelPreview } from "../../components/preview/MotionLevelPreview";
import { useSubtitlePresets } from "../../hooks/useSubtitlePresets";
import { api } from "../../api/client";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Steps — includes Step 0 (Channel) and Step 1 (Project) before content steps
// ---------------------------------------------------------------------------

const STEPS: WizardStep[] = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "basics", label: "Temel Bilgiler" },
  { id: "style", label: "Stil Secimi" },
  { id: "template", label: "Sablon" },
  { id: "review", label: "Onizleme" },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface VideoWizardState {
  channelProfileId: string | null;
  contentProjectId: string | null;
  topic: string;
  title: string;
  brief: string;
  target_duration_seconds: string;
  tone: string;
  language: string;
  visual_direction: string;
  composition_direction: string;
  thumbnail_direction: string;
  subtitle_style: string;
  lower_third_style: string;
  motion_level: string;
  template_id: string;
  style_blueprint_id: string;
  render_format: string;
  karaoke_enabled: string;
}

const initialState: VideoWizardState = {
  channelProfileId: null,
  contentProjectId: null,
  topic: "",
  title: "",
  brief: "",
  target_duration_seconds: "",
  tone: "",
  language: "tr",
  visual_direction: "",
  composition_direction: "",
  thumbnail_direction: "",
  subtitle_style: "",
  lower_third_style: "",
  motion_level: "",
  template_id: "",
  style_blueprint_id: "",
  render_format: "landscape",
  karaoke_enabled: "true",
};

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

// ---------------------------------------------------------------------------
// Submit function
// ---------------------------------------------------------------------------

async function createStandardVideo(
  values: VideoWizardState,
  _userId: string,
): Promise<{ id: string }> {
  return api.post<{ id: string }>("/api/v1/modules/standard-video", {
    topic: values.topic.trim(),
    title: values.title.trim() || null,
    brief: values.brief.trim() || null,
    target_duration_seconds: values.target_duration_seconds
      ? Number(values.target_duration_seconds)
      : null,
    tone: values.tone.trim() || null,
    language: values.language.trim() || null,
    visual_direction: values.visual_direction.trim() || null,
    composition_direction: values.composition_direction.trim() || null,
    thumbnail_direction: values.thumbnail_direction.trim() || null,
    subtitle_style: values.subtitle_style || null,
    lower_third_style: values.lower_third_style || null,
    motion_level: values.motion_level || null,
    template_id: values.template_id || null,
    style_blueprint_id: values.style_blueprint_id || null,
    render_format: values.render_format || "landscape",
    karaoke_enabled: values.karaoke_enabled === "true",
    status: "draft",
    content_project_id: values.contentProjectId || null,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateVideoWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const userId = useAuthStore((s) => s.user?.id);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<VideoWizardState>(initialState);
  const { data: presetsData, isLoading: presetsLoading, error: presetsError } = useSubtitlePresets();

  function set<K extends keyof VideoWizardState>(field: K, value: VideoWizardState[K]) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  const handleChannelSelect = useCallback(
    (id: string) => set("channelProfileId", id),
    [],
  );

  const handleProjectReady = useCallback(
    (id: string) => {
      set("contentProjectId", id);
      // Auto-advance to basics step
      setStep(2);
    },
    [],
  );

  const { mutate, isPending, error } = useMutation({
    mutationFn: (v: VideoWizardState) => createStandardVideo(v, userId!),
    onSuccess: (_created) => {
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      toast.success("Video projesi basariyla olusturuldu");
      // Navigate to project detail if we have a project ID, else projects list
      if (values.contentProjectId) {
        navigate(`/user/projects/${values.contentProjectId}`);
      } else {
        navigate(`/user/projects`);
      }
    },
  });

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return !!values.channelProfileId;
      case 1:
        return !!values.contentProjectId;
      case 2:
        return values.topic.trim().length > 0;
      default:
        return true;
    }
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      mutate(values);
    }
  }

  return (
    <WizardShell
      title="Yeni Video Olustur"
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={handleNext}
      onCancel={() => navigate(-1)}
      nextDisabled={!canGoNext() || isPending}
      isLastStep={step === STEPS.length - 1}
      nextLabel={
        step === STEPS.length - 1
          ? isPending
            ? "Olusturuluyor..."
            : "Olustur"
          : step === 1
            ? undefined // project step has its own button
            : undefined
      }
      testId="create-video-wizard"
    >
      {/* Step 0: Channel selection */}
      {step === 0 && (
        <ChannelProfileStep
          selectedId={values.channelProfileId}
          onSelect={handleChannelSelect}
        />
      )}

      {/* Step 1: Project creation */}
      {step === 1 && values.channelProfileId && (
        <ContentProjectStep
          channelProfileId={values.channelProfileId}
          moduleType="standard_video"
          existingProjectId={values.contentProjectId}
          onProjectReady={handleProjectReady}
        />
      )}

      {/* Step 2: Basics */}
      {step === 2 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Konu <span className="text-error-dark">*</span>
            </label>
            <input
              className={inputCls}
              value={values.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="Icerigin ana konusu"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Baslik
            </label>
            <input
              className={inputCls}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Opsiyonel etiket"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Brief</label>
            <textarea
              className={cn(inputCls, "min-h-[60px] resize-y")}
              value={values.brief}
              onChange={(e) => set("brief", e.target.value)}
              placeholder="Kisa aciklama veya yonlendirme"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Hedef Sure (sn)
              </label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={values.target_duration_seconds}
                onChange={(e) => set("target_duration_seconds", e.target.value)}
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Dil</label>
              <select
                className={inputCls}
                value={values.language}
                onChange={(e) => set("language", e.target.value)}
              >
                <option value="tr">Turkce</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Ton</label>
              <input
                className={inputCls}
                value={values.tone}
                onChange={(e) => set("tone", e.target.value)}
                placeholder="formal, casual, dramatic"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Gorsel Yon
              </label>
              <input
                className={inputCls}
                value={values.visual_direction}
                onChange={(e) => set("visual_direction", e.target.value)}
                placeholder="clean, cinematic, minimal"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Style */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Stil Sablonu</h3>
            <StyleBlueprintSelector
              value={values.style_blueprint_id || null}
              onChange={(id) => set("style_blueprint_id", id ?? "")}
              moduleScope="standard_video"
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Kompozisyon Yonu</h3>
            <CompositionDirectionPreview
              selected={values.composition_direction || undefined}
              onSelect={(dir) => set("composition_direction", dir)}
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Thumbnail Yonu</h3>
            <ThumbnailDirectionPreview
              selected={values.thumbnail_direction || undefined}
              onSelect={(dir) => set("thumbnail_direction", dir)}
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Altyazi Stili</h3>
            <SubtitleStylePicker
              value={values.subtitle_style}
              onChange={(presetId) => set("subtitle_style", presetId)}
              presets={presetsData?.presets ?? []}
              loading={presetsLoading}
              error={
                presetsError instanceof Error
                  ? presetsError.message
                  : presetsError
                    ? String(presetsError)
                    : null
              }
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Alt Bant Stili</h3>
            <LowerThirdStylePreview
              selected={values.lower_third_style || undefined}
              onSelect={(style) => set("lower_third_style", style)}
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Hareket Seviyesi</h3>
            <MotionLevelPreview
              selected={values.motion_level || undefined}
              onSelect={(level) => set("motion_level", level)}
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Video Formati</h3>
            <div className="flex gap-2">
              {(
                [
                  { value: "landscape", label: "16:9 (Yatay)", desc: "YouTube, TV" },
                  { value: "portrait", label: "9:16 (Shorts)", desc: "Shorts, Reels, TikTok" },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("render_format", value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-center",
                    values.render_format === value
                      ? "bg-brand-50 text-brand-700 border-brand-400 ring-1 ring-brand-200"
                      : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[11px] text-neutral-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Karaoke Altyazi</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.karaoke_enabled === "true"}
                onChange={(e) => set("karaoke_enabled", e.target.checked ? "true" : "false")}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-neutral-700">Kelime bazli karaoke highlight</span>
            </label>
          </div>
        </div>
      )}

      {/* Step 4: Template */}
      {step === 4 && (
        <div>
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Sablon Secimi</h3>
          <TemplateSelector
            value={values.template_id || null}
            onChange={(id) => set("template_id", id ?? "")}
            moduleScope="standard_video"
          />
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div>
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Onizleme</h3>
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <ReviewRow label="Kanal" value={values.channelProfileId ? `...${values.channelProfileId.slice(-8)}` : ""} />
            <ReviewRow label="Proje" value={values.contentProjectId ? `...${values.contentProjectId.slice(-8)}` : ""} />
            <ReviewRow label="Konu" value={values.topic} />
            <ReviewRow label="Baslik" value={values.title} />
            <ReviewRow label="Brief" value={values.brief} />
            <ReviewRow
              label="Sure"
              value={values.target_duration_seconds ? `${values.target_duration_seconds}s` : ""}
            />
            <ReviewRow label="Dil" value={values.language} />
            <ReviewRow label="Ton" value={values.tone} />
            <ReviewRow label="Gorsel Yon" value={values.visual_direction} />
            <ReviewRow label="Kompozisyon" value={values.composition_direction} />
            <ReviewRow label="Thumbnail" value={values.thumbnail_direction} />
            <ReviewRow label="Altyazi" value={values.subtitle_style} />
            <ReviewRow label="Alt Bant" value={values.lower_third_style} />
            <ReviewRow label="Hareket" value={values.motion_level} />
            <ReviewRow
              label="Format"
              value={values.render_format === "portrait" ? "9:16 (Shorts)" : "16:9 (Yatay)"}
            />
            <ReviewRow label="Karaoke" value={values.karaoke_enabled === "true" ? "Acik" : "Kapali"} />
            <ReviewRow
              label="Sablon"
              value={values.template_id ? values.template_id.slice(0, 8) + "..." : ""}
            />
            <ReviewRow
              label="Stil"
              value={values.style_blueprint_id ? values.style_blueprint_id.slice(0, 8) + "..." : ""}
            />
          </div>
          {error && (
            <p className="text-error-dark text-sm mt-2 break-words [overflow-wrap:anywhere]">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
        </div>
      )}
    </WizardShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="text-neutral-800">
        {value || <em className="text-neutral-300">{"\u2014"}</em>}
      </span>
    </div>
  );
}
