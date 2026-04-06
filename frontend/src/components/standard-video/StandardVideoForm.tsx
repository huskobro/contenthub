import { useState } from "react";
import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { SubtitleStylePicker } from "./SubtitleStylePicker";
import { useSubtitlePresets } from "../../hooks/useSubtitlePresets";
import { TemplateSelector } from "../preview/TemplateSelector";
import { StyleBlueprintSelector } from "../preview/StyleBlueprintSelector";
import { cn } from "../../lib/cn";

export interface StandardVideoFormValues {
  topic: string;
  title: string;
  brief: string;
  target_duration_seconds: string;
  tone: string;
  language: string;
  visual_direction: string;
  subtitle_style: string;
  template_id: string;
  style_blueprint_id: string;
  status: string;
}

interface Props {
  initial?: Partial<StandardVideoResponse>;
  onSubmit: (values: StandardVideoFormValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
  onCancel?: () => void;
  submitLabel?: string;
}

const STATUS_OPTIONS = ["draft", "script_ready", "metadata_ready", "ready", "failed"];

function toStr(v: string | null | undefined): string {
  return v ?? "";
}

export function StandardVideoForm({
  initial,
  onSubmit,
  isSubmitting,
  submitError,
  onCancel,
  submitLabel = "Kaydet",
}: Props) {
  const { data: presetsData, isLoading: presetsLoading, error: presetsError } = useSubtitlePresets();

  const [values, setValues] = useState<StandardVideoFormValues>({
    topic: toStr(initial?.topic),
    title: toStr(initial?.title),
    brief: toStr(initial?.brief),
    target_duration_seconds: initial?.target_duration_seconds != null
      ? String(initial.target_duration_seconds)
      : "",
    tone: toStr(initial?.tone),
    language: toStr(initial?.language),
    visual_direction: toStr(initial?.visual_direction),
    subtitle_style: toStr(initial?.subtitle_style),
    template_id: toStr(initial?.template_id),
    style_blueprint_id: toStr(initial?.style_blueprint_id),
    status: toStr(initial?.status) || "draft",
  });
  const [topicError, setTopicError] = useState("");
  const [durationError, setDurationError] = useState("");

  function set(field: keyof StandardVideoFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    if (!values.topic.trim()) {
      setTopicError("Konu zorunludur.");
      valid = false;
    } else {
      setTopicError("");
    }
    if (values.target_duration_seconds !== "") {
      const n = Number(values.target_duration_seconds);
      if (isNaN(n) || !isFinite(n) || n < 0) {
        setDurationError("Hedef süre negatif olamaz.");
        valid = false;
      } else {
        setDurationError("");
      }
    } else {
      setDurationError("");
    }
    if (!valid) return;
    onSubmit(values);
  }

  const inputCls = "block w-full px-2 py-1.5 text-md border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

  return (
    <form onSubmit={handleSubmit} className="max-w-[560px]">
      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">
          Konu <span className="text-error">*</span>
        </label>
        <input
          className={inputCls}
          value={values.topic}
          onChange={(e) => set("topic", e.target.value)}
          placeholder="Videonun ana konusu"
        />
        {topicError && (
          <p className="text-error text-base mt-1 mb-0">{topicError}</p>
        )}
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Başlık</label>
        <input
          className={inputCls}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Kullanıcı dostu etiket (opsiyonel)"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Brief</label>
        <textarea
          className={cn(inputCls, "min-h-[80px] resize-y")}
          value={values.brief}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="Kısa açıklama veya yönlendirme"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Hedef Süre (saniye)</label>
        <input
          className={inputCls}
          type="number"
          min={0}
          value={values.target_duration_seconds}
          onChange={(e) => set("target_duration_seconds", e.target.value)}
          placeholder="örn. 120"
        />
        {durationError && (
          <p className="text-error text-base mt-1 mb-0">{durationError}</p>
        )}
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Ton</label>
        <input
          className={inputCls}
          value={values.tone}
          onChange={(e) => set("tone", e.target.value)}
          placeholder="örn. formal, casual, dramatic"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Dil</label>
        <input
          className={inputCls}
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          placeholder="örn. tr, en"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Görsel Yön</label>
        <input
          className={inputCls}
          value={values.visual_direction}
          onChange={(e) => set("visual_direction", e.target.value)}
          placeholder="örn. clean, cinematic, minimal"
        />
      </div>

      <div className="mb-3.5">
        <SubtitleStylePicker
          value={values.subtitle_style}
          onChange={(presetId) => set("subtitle_style", presetId)}
          presets={presetsData?.presets ?? []}
          loading={presetsLoading}
          error={presetsError instanceof Error ? presetsError.message : (presetsError ? String(presetsError) : null)}
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1.5">Sablon Secimi</label>
        <TemplateSelector
          value={values.template_id || null}
          onChange={(id) => set("template_id", id ?? "")}
          moduleScope="standard_video"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1.5">Stil Sablonu Secimi</label>
        <StyleBlueprintSelector
          value={values.style_blueprint_id || null}
          onChange={(id) => set("style_blueprint_id", id ?? "")}
          moduleScope="standard_video"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Durum</label>
        <select
          className={inputCls}
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p className="text-error text-md mb-3 break-words [overflow-wrap:anywhere]">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-5 py-2 text-md bg-brand-500 text-neutral-0 border-none rounded-sm",
            isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-brand-600 transition-colors duration-fast"
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-md bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer hover:bg-neutral-50 transition-colors duration-fast"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
