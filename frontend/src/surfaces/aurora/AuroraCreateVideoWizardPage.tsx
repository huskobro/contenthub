/**
 * AuroraCreateVideoWizardPage — User-facing standard video wizard, Aurora kabuğu.
 *
 * Legacy `pages/user/CreateVideoWizardPage.tsx` ile birebir aynı:
 *   - aynı state şeması
 *   - aynı 6 step (channel → project → basics → style → template → review)
 *   - aynı POST /api/v1/modules/standard-video endpoint'i
 *   - aynı ?channelProfileId / ?contentProjectId deep-link davranışı
 *
 * Sadece kabuk Aurora: AuroraPageShell + Inspector + AuroraCard step paneli.
 */

import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { MotionLevelPreview } from "../../components/preview/MotionLevelPreview";
import { SubtitleStylePicker } from "../../components/standard-video/SubtitleStylePicker";
import { useSubtitlePresets } from "../../hooks/useSubtitlePresets";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/client";
import { useToast } from "../../hooks/useToast";

const STEPS = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "basics", label: "Temel" },
  { id: "style", label: "Stil" },
  { id: "template", label: "Şablon" },
  { id: "review", label: "Önizleme" },
] as const;

const MODULE_SCOPE = "standard_video";

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

const INITIAL: VideoWizardState = {
  channelProfileId: null,
  contentProjectId: null,
  topic: "",
  title: "",
  brief: "",
  target_duration_seconds: "",
  tone: "",
  language: "tr",
  visual_direction: "clean",
  composition_direction: "",
  thumbnail_direction: "",
  subtitle_style: "",
  lower_third_style: "",
  motion_level: "moderate",
  template_id: "",
  style_blueprint_id: "",
  render_format: "landscape",
  karaoke_enabled: "true",
};

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
  minHeight: 70,
  lineHeight: 1.6,
};

const SECTION_TITLE: CSSProperties = {
  margin: 0,
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
};

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
        {required && <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
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

function shortId(id: string | null): string {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

async function createStandardVideoForUser(values: VideoWizardState) {
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

export function AuroraCreateVideoWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const userId = useAuthStore((s) => s.user?.id);

  const [searchParams] = useSearchParams();
  const presetChannelProfileId = searchParams.get("channelProfileId");
  const presetContentProjectId = searchParams.get("contentProjectId");

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<VideoWizardState>({
    ...INITIAL,
    channelProfileId: presetChannelProfileId,
    contentProjectId: presetContentProjectId,
  });

  useEffect(() => {
    if (presetChannelProfileId && presetContentProjectId) setStep(2);
    else if (presetChannelProfileId) setStep(1);
  }, [presetChannelProfileId, presetContentProjectId]);

  const { data: presetsData, isLoading: presetsLoading, error: presetsError } = useSubtitlePresets();
  const { data: templates } = useTemplatesList({
    status: "active",
    module_scope: MODULE_SCOPE,
  });
  const { data: blueprints } = useStyleBlueprintsList({
    status: "active",
    module_scope: MODULE_SCOPE,
  });

  const selectedTemplate = (templates ?? []).find((t) => t.id === values.template_id) ?? null;
  const selectedBlueprint =
    (blueprints ?? []).find((b) => b.id === values.style_blueprint_id) ?? null;

  function set<K extends keyof VideoWizardState>(key: K, value: VideoWizardState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const { mutate, isPending, error: submitError } = useMutation({
    mutationFn: () => createStandardVideoForUser(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      toast.success("Video projesi başarıyla oluşturuldu");
      if (values.contentProjectId) {
        navigate(`/user/projects/${values.contentProjectId}`);
      } else {
        navigate("/user/projects");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Oluşturma başarısız");
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

  const isLastStep = step === STEPS.length - 1;

  function handleNext() {
    if (isLastStep) {
      if (!userId) {
        toast.error("Oturum bulunamadı");
        return;
      }
      mutate();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleCancel() {
    navigate("/user/projects");
  }

  function stepState(i: number): "done" | "active" | "pending" {
    return i < step ? "done" : i === step ? "active" : "pending";
  }

  const visualOptions = [
    { value: "clean", label: "Temiz", desc: "Sade, açık ton" },
    { value: "cinematic", label: "Sinematik", desc: "Koyu, gradient" },
    { value: "minimal", label: "Minimal", desc: "Watermark yok" },
  ] as const;
  const formatOptions = [
    { value: "landscape", label: "16:9", desc: "YouTube, TV" },
    { value: "portrait", label: "9:16", desc: "Shorts, Reels" },
  ] as const;

  const durationLabel = values.target_duration_seconds
    ? `${values.target_duration_seconds}s`
    : "—";
  const formatLabel = values.render_format === "portrait" ? "9:16 (Shorts)" : "16:9 (Yatay)";

  const inspector = (
    <AuroraInspector title="Plan özeti">
      <AuroraInspectorSection title="Bağlam">
        <AuroraInspectorRow label="kanal" value={shortId(values.channelProfileId) || "—"} />
        <AuroraInspectorRow label="proje" value={shortId(values.contentProjectId) || "—"} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="İçerik">
        <AuroraInspectorRow label="konu" value={values.topic || "—"} />
        <AuroraInspectorRow label="başlık" value={values.title || "—"} />
        <AuroraInspectorRow label="dil" value={values.language || "—"} />
        <AuroraInspectorRow label="ton" value={values.tone || "—"} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Stil & format">
        <AuroraInspectorRow label="görsel" value={values.visual_direction || "—"} />
        <AuroraInspectorRow label="hareket" value={values.motion_level || "—"} />
        <AuroraInspectorRow label="kompozisyon" value={values.composition_direction || "—"} />
        <AuroraInspectorRow label="thumbnail" value={values.thumbnail_direction || "—"} />
        <AuroraInspectorRow label="altyazı" value={values.subtitle_style || "—"} />
        <AuroraInspectorRow label="alt bant" value={values.lower_third_style || "—"} />
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
          value={selectedTemplate?.name ?? shortId(values.template_id)}
        />
        <AuroraInspectorRow
          label="blueprint"
          value={selectedBlueprint?.name ?? shortId(values.style_blueprint_id)}
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

  const stepChannel = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-channel">
      <h3 style={SECTION_TITLE}>Kanal seçimi</h3>
      <ChannelProfileStep
        selectedId={values.channelProfileId}
        onSelect={(id) => set("channelProfileId", id)}
      />
    </AuroraCard>
  );

  const stepProject = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-project">
      <h3 style={SECTION_TITLE}>Proje</h3>
      {values.channelProfileId ? (
        <ContentProjectStep
          channelProfileId={values.channelProfileId}
          moduleType="standard_video"
          existingProjectId={values.contentProjectId}
          onProjectReady={(id) => {
            set("contentProjectId", id);
            setStep(2);
          }}
        />
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Önce kanal seçin.
        </div>
      )}
    </AuroraCard>
  );

  const stepBasics = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-basics">
      <h3 style={SECTION_TITLE}>Temel bilgiler</h3>
      <FormField label="Konu" required>
        <input
          style={INPUT_STYLE}
          value={values.topic}
          onChange={(e) => set("topic", e.target.value)}
          placeholder="İçeriğin ana konusu"
          autoFocus
          data-testid="aurora-cv-topic"
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
          style={TEXTAREA_STYLE}
          value={values.brief}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="Kısa açıklama veya yönlendirme"
          rows={3}
        />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
    </AuroraCard>
  );

  const stepStyle = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-style">
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
      <FormField label="Alt bant stili">
        <LowerThirdStylePreview
          selected={values.lower_third_style || undefined}
          onSelect={(style) => set("lower_third_style", style)}
        />
      </FormField>
      <FormField label="Hareket seviyesi">
        <MotionLevelPreview
          selected={values.motion_level || undefined}
          onSelect={(level) => set("motion_level", level)}
        />
      </FormField>
      <FormField label="Video formatı">
        <ChoiceCardRow
          options={formatOptions}
          value={(values.render_format || "landscape") as typeof formatOptions[number]["value"]}
          onChange={(v) => set("render_format", v)}
        />
      </FormField>
      <FormField
        label="Karaoke altyazı"
        hint="Açık: kelime bazlı highlight. Kapalı: standart zamanlama."
      >
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
            onChange={(e) => set("karaoke_enabled", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--accent-primary)" }}
          />
          Kelime bazlı karaoke highlight
        </label>
      </FormField>
    </AuroraCard>
  );

  const stepTemplate = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-template">
      <h3 style={SECTION_TITLE}>Şablon seçimi</h3>
      <TemplateSelector
        value={values.template_id || null}
        onChange={(id) => set("template_id", id ?? "")}
        moduleScope={MODULE_SCOPE}
      />
    </AuroraCard>
  );

  const stepReview = (
    <AuroraCard pad="default" data-testid="aurora-cv-step-review">
      <h3 style={SECTION_TITLE}>Önizleme</h3>
      <div>
        <ReviewRow k="kanal" v={shortId(values.channelProfileId)} />
        <ReviewRow k="proje" v={shortId(values.contentProjectId)} />
        <ReviewRow k="konu" v={values.topic} />
        <ReviewRow k="başlık" v={values.title} />
        <ReviewRow k="brief" v={values.brief} />
        <ReviewRow k="süre" v={durationLabel === "—" ? "" : durationLabel} />
        <ReviewRow k="dil" v={values.language} />
        <ReviewRow k="ton" v={values.tone} />
        <ReviewRow k="görsel yön" v={values.visual_direction} />
        <ReviewRow k="kompozisyon" v={values.composition_direction} />
        <ReviewRow k="thumbnail" v={values.thumbnail_direction} />
        <ReviewRow k="altyazı" v={values.subtitle_style} />
        <ReviewRow k="alt bant" v={values.lower_third_style} />
        <ReviewRow k="hareket" v={values.motion_level} />
        <ReviewRow k="format" v={formatLabel} />
        <ReviewRow k="karaoke" v={values.karaoke_enabled === "true" ? "açık" : "kapalı"} />
        <ReviewRow k="template" v={selectedTemplate?.name ?? shortId(values.template_id)} />
        <ReviewRow k="blueprint" v={selectedBlueprint?.name ?? shortId(values.style_blueprint_id)} />
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
      ? stepChannel
      : step === 1
        ? stepProject
        : step === 2
          ? stepBasics
          : step === 3
            ? stepStyle
            : step === 4
              ? stepTemplate
              : stepReview;

  const stepper = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
      data-testid="aurora-cv-stepper"
    >
      {STEPS.map((s, i) => {
        const state = stepState(i);
        const dotColor =
          state === "done"
            ? "var(--state-success-fg)"
            : state === "active"
              ? "var(--accent-primary)"
              : "var(--border-default)";
        const labelColor = state === "pending" ? "var(--text-muted)" : "var(--text-primary)";
        return (
          <Fragment key={s.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    i < step ? "var(--state-success-fg)" : "var(--border-default)",
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-create-video-wizard">
      <AuroraPageShell
        title="Yeni Video Oluştur"
        description="Kanal → proje → temel → stil → şablon → önizleme"
        breadcrumbs={[
          { label: "Projelerim", href: "/user/projects" },
          { label: "Yeni Video" },
        ]}
        actions={
          <AuroraButton variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
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

          <AuroraButton
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext() || isPending}
            iconRight={isLastStep ? undefined : <Icon name="arrow-right" size={12} />}
            data-testid="aurora-cv-next"
          >
            {isLastStep ? (isPending ? "Oluşturuluyor…" : "Oluştur") : "Devam et"}
          </AuroraButton>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
