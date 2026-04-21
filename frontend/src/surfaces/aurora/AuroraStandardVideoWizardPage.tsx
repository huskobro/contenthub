/**
 * AuroraStandardVideoWizardPage — Aurora Dusk Cockpit / Yeni Standart Video.
 *
 * Legacy `StandardVideoWizardPage` (ContentCreationWizard) ile aynı state
 * şemasını ve aynı backend endpoint'ini kullanır:
 *   POST /api/v1/modules/standard-video
 *
 * Tasarım hedefi:
 *   - AuroraPageShell + breadcrumb (Standard Videos → Wizard)
 *   - Sol/üst: stepper + her adım kendi `AuroraCard` panelinde
 *   - Sağ: AuroraInspector → "Plan özeti" (konu, stil, süre, template)
 *   - Step state = AYNI store (legacy WizardValues şeması birebir korunur)
 *
 * Kapsam dışı:
 *   - Yeni iş akışı / yeni endpoint icat edilmez.
 *   - Pipeline davranışı veya validation kuralları değiştirilmez.
 *
 * Bu sayfa surface override olarak `admin.standard-video.wizard` slot'una
 * bağlanır (register.tsx kayıt aşamasında); legacy trampoline ise
 * `pages/admin/StandardVideoWizardPage.tsx` içindedir.
 */

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AuroraPageShell,
  AuroraCard,
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";
import type { WizardValues } from "../../components/wizard/ContentCreationWizard";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { SubtitleStylePicker } from "../../components/standard-video/SubtitleStylePicker";
import { useSubtitlePresets } from "../../hooks/useSubtitlePresets";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { api } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { toastMessageFromError } from "../../lib/errorUtils";

// --- constants -------------------------------------------------------------

const STEPS = [
  { id: "basics", label: "Temel Bilgiler" },
  { id: "style", label: "Stil Seçimi" },
  { id: "template", label: "Şablon" },
  { id: "review", label: "Önizleme" },
] as const;

const MODULE_SCOPE = "standard_video";

const DEFAULT_VALUES: WizardValues = {
  topic: "",
  title: "",
  brief: "",
  target_duration_seconds: "",
  tone: "",
  language: "tr",
  visual_direction: "clean",
  motion_level: "moderate",
  composition_direction: "",
  thumbnail_direction: "",
  subtitle_style: "",
  template_id: "",
  style_blueprint_id: "",
  render_format: "landscape",
  karaoke_enabled: "true",
};

// --- styles (inline tokens) ------------------------------------------------

const FIELD_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 5,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const TEXTAREA_STYLE: CSSProperties = {
  ...INPUT_STYLE,
  height: undefined,
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

const SECTION_TITLE: CSSProperties = {
  margin: 0,
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
};

// --- helpers ---------------------------------------------------------------

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={FIELD_LABEL}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ChoiceCardRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string; desc: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(({ value: v, label, desc }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 8px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "center",
              background: selected
                ? "var(--accent-primary-bg, rgba(110,168,254,0.10))"
                : "var(--bg-surface)",
              border: selected
                ? "1px solid var(--accent-primary)"
                : "1px solid var(--border-default)",
              color: selected ? "var(--accent-primary-hover)" : "var(--text-primary)",
              transition: "background-color .14s, border-color .14s",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 12,
        padding: "6px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span
        style={{
          width: 130,
          flexShrink: 0,
          fontSize: 11,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {k}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        {v || <em style={{ color: "var(--text-muted)" }}>{"—"}</em>}
      </span>
    </div>
  );
}

function shortId(id: string): string {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

// --- mutation --------------------------------------------------------------

async function createStandardVideo(values: WizardValues) {
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

// --- page ------------------------------------------------------------------

export function AuroraStandardVideoWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(DEFAULT_VALUES);

  const {
    data: presetsData,
    isLoading: presetsLoading,
    error: presetsError,
  } = useSubtitlePresets();

  // Inspector "plan özeti" için template/blueprint adlarını çözelim.
  const { data: templates } = useTemplatesList({
    status: "active",
    module_scope: MODULE_SCOPE,
  });
  const { data: blueprints } = useStyleBlueprintsList({
    status: "active",
    module_scope: MODULE_SCOPE,
  });

  const selectedTemplate =
    (templates ?? []).find((t) => t.id === values.template_id) ?? null;
  const selectedBlueprint =
    (blueprints ?? []).find((b) => b.id === values.style_blueprint_id) ?? null;

  const { mutate, isPending, error: submitError } = useMutation({
    mutationFn: createStandardVideo,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      toast.success("Standard video başarıyla oluşturuldu");
      navigate(`/admin/standard-videos/${created.id}`);
    },
    onError: (err) => {
      // Faz 4: surface classified server detail in addition to inline message.
      toast.error(toastMessageFromError(err));
    },
  });

  function set<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const canGoNext = step === 0 ? values.topic.trim().length > 0 : true;
  const isLastStep = step === STEPS.length - 1;

  // Faz 4.1 — disabled "Devam et" butonu için yardım metni
  const nextDisabledReason: string | null =
    step === 0 && values.topic.trim().length === 0
      ? "Devam etmek için 'Konu' alanı zorunludur."
      : null;

  function handleNext() {
    if (isLastStep) {
      mutate(values);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleCancel() {
    navigate("/admin/standard-videos");
  }

  function stepState(i: number): "done" | "active" | "pending" {
    return i < step ? "done" : i === step ? "active" : "pending";
  }

  // --- inspector --------------------------------------------------------

  const durationLabel = values.target_duration_seconds
    ? `${values.target_duration_seconds}s`
    : "—";
  const formatLabel =
    values.render_format === "portrait" ? "9:16 (Shorts)" : "16:9 (Yatay)";

  const inspector = (
    <AuroraInspector title="Plan özeti">
      <AuroraInspectorSection title="İçerik">
        <AuroraInspectorRow label="konu" value={values.topic || "—"} />
        <AuroraInspectorRow label="başlık" value={values.title || "—"} />
        <AuroraInspectorRow label="dil" value={values.language || "—"} />
        <AuroraInspectorRow label="ton" value={values.tone || "—"} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Stil & format">
        <AuroraInspectorRow label="görsel yön" value={values.visual_direction || "—"} />
        <AuroraInspectorRow label="hareket" value={values.motion_level || "—"} />
        <AuroraInspectorRow
          label="kompozisyon"
          value={values.composition_direction || "—"}
        />
        <AuroraInspectorRow
          label="thumbnail"
          value={values.thumbnail_direction || "—"}
        />
        <AuroraInspectorRow label="altyazı" value={values.subtitle_style || "—"} />
        <AuroraInspectorRow label="format" value={formatLabel} />
        <AuroraInspectorRow
          label="karaoke"
          value={values.karaoke_enabled === "true" ? "açık" : "kapalı"}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Süre & şablon">
        <AuroraInspectorRow label="süre" value={durationLabel} />
        <AuroraInspectorRow
          label="template"
          value={selectedTemplate?.name ?? (values.template_id ? shortId(values.template_id) : "—")}
        />
        <AuroraInspectorRow
          label="blueprint"
          value={selectedBlueprint?.name ?? (values.style_blueprint_id ? shortId(values.style_blueprint_id) : "—")}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Adım">
        <AuroraInspectorRow
          label="aşama"
          value={`${step + 1}/${STEPS.length} · ${STEPS[step].label}`}
        />
        <AuroraInspectorRow
          label="durum"
          value={
            <AuroraStatusChip tone={isPending ? "info" : "neutral"}>
              {isPending ? "kaydediliyor" : "taslak"}
            </AuroraStatusChip>
          }
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // --- step body --------------------------------------------------------

  const visualOptions = [
    { value: "clean", label: "Temiz", desc: "Sade, açık ton" },
    { value: "cinematic", label: "Sinematik", desc: "Koyu, gradient" },
    { value: "minimal", label: "Minimal", desc: "Watermark yok" },
  ] as const;
  const motionOptions = [
    { value: "minimal", label: "Minimal", desc: "Kesme geçiş" },
    { value: "moderate", label: "Orta", desc: "Crossfade, Ken Burns" },
    { value: "dynamic", label: "Dinamik", desc: "Agresif hareket" },
  ] as const;
  const formatOptions = [
    { value: "landscape", label: "16:9", desc: "YouTube, TV" },
    { value: "portrait", label: "9:16", desc: "Shorts, Reels" },
  ] as const;

  const stepBasics = (
    <AuroraCard pad="default" data-testid="aurora-svw-step-basics">
      <h3 style={SECTION_TITLE}>Temel bilgiler</h3>
      <FormField label="Konu" required>
        <input
          style={INPUT_STYLE}
          value={values.topic}
          onChange={(e) => set("topic", e.target.value)}
          placeholder="İçeriğin ana konusu"
          autoFocus
          data-testid="aurora-svw-topic"
        />
      </FormField>
      <FormField label="Başlık">
        <input
          style={INPUT_STYLE}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Opsiyonel etiket"
        />
      </FormField>
      <FormField label="Brief">
        <textarea
          style={{ ...TEXTAREA_STYLE, minHeight: 70 }}
          value={values.brief}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="Kısa açıklama veya yönlendirme"
          rows={3}
        />
      </FormField>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        <FormField label="Hedef süre (sn)">
          <input
            style={INPUT_STYLE}
            type="number"
            min={0}
            value={values.target_duration_seconds}
            onChange={(e) => set("target_duration_seconds", e.target.value)}
            placeholder="120"
          />
        </FormField>
        <FormField label="Dil">
          <select
            style={INPUT_STYLE}
            value={values.language}
            onChange={(e) => set("language", e.target.value)}
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </FormField>
      </div>
      <FormField label="Ton">
        <input
          style={INPUT_STYLE}
          value={values.tone}
          onChange={(e) => set("tone", e.target.value)}
          placeholder="formal, casual, dramatic"
        />
      </FormField>
      <FormField label="Görsel yön">
        <ChoiceCardRow
          options={visualOptions}
          value={(values.visual_direction || "clean") as typeof visualOptions[number]["value"]}
          onChange={(v) => set("visual_direction", v)}
        />
      </FormField>
      <FormField label="Hareket seviyesi">
        <ChoiceCardRow
          options={motionOptions}
          value={(values.motion_level || "moderate") as typeof motionOptions[number]["value"]}
          onChange={(v) => set("motion_level", v)}
        />
      </FormField>
    </AuroraCard>
  );

  const stepStyle = (
    <AuroraCard pad="default" data-testid="aurora-svw-step-style">
      <h3 style={SECTION_TITLE}>Stil seçimi</h3>

      <FormField label="Stil şablonu">
        <StyleBlueprintSelector
          value={values.style_blueprint_id || null}
          onChange={(id) => set("style_blueprint_id", id ?? "")}
          moduleScope={MODULE_SCOPE}
        />
      </FormField>

      <FormField label="Kompozisyon yönü">
        <CompositionDirectionPreview
          selected={values.composition_direction || undefined}
          onSelect={(dir) => set("composition_direction", dir)}
        />
      </FormField>

      <FormField label="Thumbnail yönü">
        <ThumbnailDirectionPreview
          selected={values.thumbnail_direction || undefined}
          onSelect={(dir) => set("thumbnail_direction", dir)}
        />
      </FormField>

      <FormField label="Altyazı stili">
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
      </FormField>

      <FormField label="Video formatı">
        <ChoiceCardRow
          options={formatOptions}
          value={(values.render_format || "landscape") as typeof formatOptions[number]["value"]}
          onChange={(v) => set("render_format", v)}
        />
      </FormField>

      <FormField label="Karaoke altyazı" hint="Açık: kelime bazlı highlight. Kapalı: standart zamanlama.">
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={values.karaoke_enabled === "true"}
            onChange={(e) =>
              set("karaoke_enabled", e.target.checked ? "true" : "false")
            }
            style={{ accentColor: "var(--accent-primary)" }}
          />
          Kelime bazlı karaoke highlight
        </label>
      </FormField>
    </AuroraCard>
  );

  const stepTemplate = (
    <AuroraCard pad="default" data-testid="aurora-svw-step-template">
      <h3 style={SECTION_TITLE}>Şablon seçimi</h3>
      <TemplateSelector
        value={values.template_id || null}
        onChange={(id) => set("template_id", id ?? "")}
        moduleScope={MODULE_SCOPE}
      />
    </AuroraCard>
  );

  const stepReview = (
    <AuroraCard pad="default" data-testid="aurora-svw-step-review">
      <h3 style={SECTION_TITLE}>Önizleme</h3>
      <div>
        <ReviewRow k="konu" v={values.topic} />
        <ReviewRow k="başlık" v={values.title} />
        <ReviewRow k="brief" v={values.brief} />
        <ReviewRow k="süre" v={durationLabel === "—" ? "" : durationLabel} />
        <ReviewRow k="dil" v={values.language} />
        <ReviewRow k="ton" v={values.tone} />
        <ReviewRow k="görsel yön" v={values.visual_direction} />
        <ReviewRow k="hareket" v={values.motion_level} />
        <ReviewRow k="kompozisyon" v={values.composition_direction} />
        <ReviewRow k="thumbnail" v={values.thumbnail_direction} />
        <ReviewRow k="altyazı" v={values.subtitle_style} />
        <ReviewRow k="format" v={formatLabel} />
        <ReviewRow
          k="karaoke"
          v={values.karaoke_enabled === "true" ? "açık" : "kapalı"}
        />
        <ReviewRow
          k="template"
          v={selectedTemplate?.name ?? shortId(values.template_id)}
        />
        <ReviewRow
          k="blueprint"
          v={selectedBlueprint?.name ?? shortId(values.style_blueprint_id)}
        />
      </div>
      {submitError ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--state-danger-fg)",
            fontFamily: "var(--font-mono)",
            wordBreak: "break-word",
          }}
        >
          {submitError instanceof Error ? submitError.message : "Bilinmeyen hata"}
        </div>
      ) : null}
    </AuroraCard>
  );

  const stepBody =
    step === 0
      ? stepBasics
      : step === 1
        ? stepStyle
        : step === 2
          ? stepTemplate
          : stepReview;

  // --- stepper ----------------------------------------------------------

  const stepper = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
      data-testid="aurora-svw-stepper"
    >
      {STEPS.map((s, i) => {
        const state = stepState(i);
        const dotColor =
          state === "done"
            ? "var(--state-success-fg)"
            : state === "active"
              ? "var(--accent-primary)"
              : "var(--border-default)";
        const labelColor =
          state === "pending" ? "var(--text-muted)" : "var(--text-primary)";
        return (
          <Fragment key={s.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background:
                    state === "active"
                      ? "var(--accent-primary-bg, rgba(110,168,254,0.15))"
                      : "var(--bg-surface)",
                  border: `1px solid ${dotColor}`,
                  color: state === "pending" ? "var(--text-muted)" : dotColor,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                {state === "done" ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <span style={{ fontSize: 12, color: labelColor }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                style={{
                  flex: "0 0 28px",
                  height: 1,
                  background:
                    i < step
                      ? "var(--state-success-fg)"
                      : "var(--border-default)",
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );

  // --- render -----------------------------------------------------------

  return (
    <div className="aurora-dashboard" data-testid="aurora-standard-video-wizard">
      <AuroraPageShell
        title="Yeni Standart Video"
        description="Aşamalı sihirbaz: konu → stil → şablon → önizleme"
        breadcrumbs={[
          { label: "Standard Videos", href: "/admin/standard-videos" },
          { label: "Wizard" },
        ]}
        actions={
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            İptal
          </AuroraButton>
        }
      >
        {stepper}
        {stepBody}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 0 || isPending}
            iconLeft={<Icon name="chevron-left" size={12} />}
          >
            Geri
          </AuroraButton>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Faz 4.1 — disabled nedeni inline bildirim */}
            {nextDisabledReason ? (
              <span
                role="status"
                aria-live="polite"
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
                data-testid="aurora-svw-next-hint"
              >
                {nextDisabledReason}
              </span>
            ) : null}
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext || isPending}
              title={nextDisabledReason ?? undefined}
              iconRight={
                isLastStep ? undefined : <Icon name="arrow-right" size={12} />
              }
              data-testid="aurora-svw-next"
            >
              {isLastStep
                ? isPending
                  ? "Oluşturuluyor…"
                  : "Oluştur"
                : "Devam et"}
            </AuroraButton>
          </div>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
