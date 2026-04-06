import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WizardShell, type WizardStep } from "./WizardShell";
import { TemplateSelector } from "../preview/TemplateSelector";
import { StyleBlueprintSelector } from "../preview/StyleBlueprintSelector";
import { CompositionDirectionPreview } from "../preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../preview/ThumbnailDirectionPreview";
import { SubtitleStylePicker } from "../standard-video/SubtitleStylePicker";
import { useSubtitlePresets } from "../../hooks/useSubtitlePresets";
import { cn } from "../../lib/cn";

const STEPS: WizardStep[] = [
  { id: "basics", label: "Temel Bilgiler" },
  { id: "style", label: "Stil Secimi" },
  { id: "template", label: "Sablon" },
  { id: "review", label: "Onizleme" },
];

interface ContentCreationWizardProps {
  moduleType: "standard_video" | "news_bulletin";
  onSubmit: (values: WizardValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export interface WizardValues {
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
  template_id: string;
  style_blueprint_id: string;
}

const inputCls = "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

export function ContentCreationWizard({
  moduleType,
  onSubmit,
  isSubmitting,
  submitError,
}: ContentCreationWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { data: presetsData, isLoading: presetsLoading, error: presetsError } = useSubtitlePresets();

  const [values, setValues] = useState<WizardValues>({
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
    template_id: "",
    style_blueprint_id: "",
  });

  function set(field: keyof WizardValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  const canGoNext = () => {
    if (step === 0) return values.topic.trim().length > 0;
    return true;
  };

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onSubmit(values);
    }
  }

  const moduleLabel = moduleType === "standard_video" ? "standard_video" : "news_bulletin";

  return (
    <WizardShell
      title={moduleType === "standard_video" ? "Yeni Video Olustur" : "Yeni Haber Bulteni"}
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={handleNext}
      onCancel={() => navigate(-1)}
      nextDisabled={!canGoNext() || isSubmitting}
      isLastStep={step === STEPS.length - 1}
      nextLabel={step === STEPS.length - 1 ? (isSubmitting ? "Olusturuluyor..." : "Olustur") : undefined}
      testId="content-wizard"
    >
      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Konu <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Baslik</label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hedef Sure (sn)</label>
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
              <select className={inputCls} value={values.language} onChange={(e) => set("language", e.target.value)}>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Gorsel Yon</label>
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

      {/* Step 1: Style Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Stil Sablonu</h3>
            <StyleBlueprintSelector
              value={values.style_blueprint_id || null}
              onChange={(id) => set("style_blueprint_id", id ?? "")}
              moduleScope={moduleLabel}
            />
          </div>
          {moduleType === "standard_video" && (
            <>
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
                  error={presetsError instanceof Error ? presetsError.message : (presetsError ? String(presetsError) : null)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Template Selection */}
      {step === 2 && (
        <div>
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Sablon Secimi</h3>
          <TemplateSelector
            value={values.template_id || null}
            onChange={(id) => set("template_id", id ?? "")}
            moduleScope={moduleLabel}
          />
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Onizleme</h3>
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <Row label="Konu" value={values.topic} />
            <Row label="Baslik" value={values.title} />
            <Row label="Brief" value={values.brief} />
            <Row label="Sure" value={values.target_duration_seconds ? `${values.target_duration_seconds}s` : ""} />
            <Row label="Dil" value={values.language} />
            <Row label="Ton" value={values.tone} />
            <Row label="Gorsel Yon" value={values.visual_direction} />
            <Row label="Kompozisyon" value={values.composition_direction} />
            <Row label="Thumbnail" value={values.thumbnail_direction} />
            <Row label="Altyazi" value={values.subtitle_style} />
            <Row label="Sablon" value={values.template_id ? values.template_id.slice(0, 8) + "..." : ""} />
            <Row label="Stil" value={values.style_blueprint_id ? values.style_blueprint_id.slice(0, 8) + "..." : ""} />
          </div>
          {submitError && (
            <p className="text-red-600 text-sm mt-2 break-words [overflow-wrap:anywhere]">{submitError}</p>
          )}
        </div>
      )}
    </WizardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="text-neutral-800">{value || <em className="text-neutral-300">{"\u2014"}</em>}</span>
    </div>
  );
}
