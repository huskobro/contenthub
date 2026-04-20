/**
 * AuroraStyleBlueprintCreatePage — Aurora Dusk Cockpit / Yeni Style Blueprint (admin).
 *
 * Tasarım hedefi:
 *   - Page-shell breadcrumb ("Style Blueprints / Yeni") + page-head
 *   - Form (max-width 720): name, module_scope, status, version, notes
 *     + segmented chip seçicilerle motion / layout / subtitle / thumbnail
 *       preset değerleri ve disallowed elements
 *     + opsiyonel JSON override textarea'ları (visual / motion / layout /
 *       subtitle / thumbnail / preview_strategy / disallowed)
 *   - Sağ Inspector:
 *       • Sayfa amacı
 *       • Form özeti (ad, scope, status, version)
 *       • Visual identity preview — seçilen motion + layout + subtitle +
 *         thumbnail değerleri chip stack olarak
 *       • Doğrulama hataları (varsa)
 *   - Submit: useCreateStyleBlueprint mutation
 *   - Success: /admin/style-blueprints redirect (state.selectedId ile)
 *   - Cancel: /admin/style-blueprints
 *
 * Not: Bu sayfa surface override sistemi tarafından
 * `admin.style-blueprints.create` slot'una bağlanır
 * (register.tsx — bu task kapsamı dışı; main thread atomic ekleyecek).
 *
 * Veri kaynağı: useCreateStyleBlueprint (legacy ile aynı imza)
 *               + createStyleBlueprint payload contract
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateStyleBlueprint } from "../../hooks/useCreateStyleBlueprint";
import { useToast } from "../../hooks/useToast";
import { validateJson, safeJsonPretty } from "../../lib/safeJson";
import { BLUEPRINT_STATUSES } from "../../constants/statusOptions";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Preset options — segmented chip seçicilerle sunulur, JSON üretirler.
// ---------------------------------------------------------------------------

const MOTION_PRESETS = [
  { value: "minimal", label: "Minimal" },
  { value: "calm", label: "Calm" },
  { value: "dynamic", label: "Dynamic" },
  { value: "energetic", label: "Energetic" },
] as const;

const LAYOUT_PRESETS = [
  { value: "centered", label: "Centered" },
  { value: "split", label: "Split" },
  { value: "asymmetric", label: "Asymmetric" },
  { value: "fullbleed", label: "Full-bleed" },
] as const;

const SUBTITLE_PRESETS = [
  { value: "bottom_clean", label: "Bottom · Clean" },
  { value: "bottom_boxed", label: "Bottom · Boxed" },
  { value: "karaoke", label: "Karaoke" },
  { value: "block", label: "Block" },
] as const;

const THUMBNAIL_PRESETS = [
  { value: "headline_focus", label: "Headline focus" },
  { value: "portrait", label: "Portrait" },
  { value: "split_image", label: "Split image" },
  { value: "data_card", label: "Data card" },
] as const;

const DISALLOWED_OPTIONS = [
  { value: "memes", label: "Memes" },
  { value: "stock_clips", label: "Stock clips" },
  { value: "transitions_3d", label: "3D transitions" },
  { value: "music_loud", label: "Loud music" },
  { value: "auto_zoom", label: "Auto-zoom" },
] as const;

type MotionPreset = (typeof MOTION_PRESETS)[number]["value"] | "";
type LayoutPreset = (typeof LAYOUT_PRESETS)[number]["value"] | "";
type SubtitlePreset = (typeof SUBTITLE_PRESETS)[number]["value"] | "";
type ThumbnailPreset = (typeof THUMBNAIL_PRESETS)[number]["value"] | "";

interface FormState {
  name: string;
  module_scope: string;
  status: string;
  version: string;
  notes: string;
  motion: MotionPreset;
  layout: LayoutPreset;
  subtitle: SubtitlePreset;
  thumbnail: ThumbnailPreset;
  disallowed: string[];
  visual_rules_json: string;
  motion_rules_json: string;
  layout_rules_json: string;
  subtitle_rules_json: string;
  thumbnail_rules_json: string;
  preview_strategy_json: string;
}

const INITIAL: FormState = {
  name: "",
  module_scope: "",
  status: "draft",
  version: "1",
  notes: "",
  motion: "calm",
  layout: "centered",
  subtitle: "bottom_clean",
  thumbnail: "headline_focus",
  disallowed: [],
  visual_rules_json: "",
  motion_rules_json: "",
  layout_rules_json: "",
  subtitle_rules_json: "",
  thumbnail_rules_json: "",
  preview_strategy_json: "",
};

const FAMILY_SUGGESTIONS = [
  "",
  "standard_video",
  "news_bulletin",
  "product_review",
  "educational_video",
  "howto_video",
] as const;

// ---------------------------------------------------------------------------
// Local field primitives — match cockpit.css visual language
// ---------------------------------------------------------------------------

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 5,
};

const inputBaseStyle: CSSProperties = {
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
  transition: "border-color .14s",
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  ...inputBaseStyle,
  appearance: "none",
};

const textareaBaseStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
  boxSizing: "border-box",
};

const monoTextareaStyle: CSSProperties = {
  ...textareaBaseStyle,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  minHeight: 90,
};

const errorBorderStyle: CSSProperties = {
  borderColor: "var(--state-danger-border)",
};

const errorTextStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--state-danger-fg)",
  marginTop: 4,
  fontFamily: "var(--font-mono)",
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.5,
};

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {hint && !error && <div style={hintStyle}>{hint}</div>}
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented chip control — mockup parity with `.segmented` pattern
// ---------------------------------------------------------------------------

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedChipsProps<T extends string> {
  value: T;
  options: readonly ChipOption<T>[];
  onChange: (next: T) => void;
  testId?: string;
}

function SegmentedChips<T extends string>({
  value,
  options,
  onChange,
  testId,
}: SegmentedChipsProps<T>) {
  return (
    <div
      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
      data-testid={testId}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: active
                ? "var(--accent-primary)"
                : "var(--border-default)",
              background: active
                ? "var(--accent-primary-soft, var(--bg-inset))"
                : "var(--bg-surface)",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: 11,
              fontFamily: "inherit",
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "border-color .14s, background .14s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-chip control (toggle set) — used for "disallowed elements"
// ---------------------------------------------------------------------------

interface MultiChipsProps {
  value: string[];
  options: readonly ChipOption<string>[];
  onToggle: (val: string) => void;
}

function MultiChips({ value, options, onToggle }: MultiChipsProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: active
                ? "var(--state-danger-border)"
                : "var(--border-default)",
              background: active
                ? "var(--state-danger-bg)"
                : "var(--bg-surface)",
              color: active
                ? "var(--state-danger-fg)"
                : "var(--text-secondary)",
              fontSize: 11,
              fontFamily: "inherit",
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "border-color .14s, background .14s",
            }}
          >
            {active ? "× " : ""}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function presetLabel<T extends string>(
  value: T | "",
  options: readonly ChipOption<T>[],
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Merge override JSON onto a preset envelope. If the override is empty we
 * return the preset envelope. If both empty we return null. JSON parse
 * failures are surfaced via the live validation path; here we silently
 * fall back to the override string so the user-authored JSON wins on the
 * server side without losing operator intent.
 */
function buildRulesJson(
  preset: string,
  overrideJson: string,
  presetKey: string,
): string | null {
  const override = overrideJson.trim();
  if (override) return override;
  if (!preset) return null;
  return JSON.stringify({ preset, [`${presetKey}_preset`]: preset });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraStyleBlueprintCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error: submitError } = useCreateStyleBlueprint();

  const [values, setValues] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function toggleDisallowed(val: string) {
    setValues((prev) => {
      const has = prev.disallowed.includes(val);
      return {
        ...prev,
        disallowed: has
          ? prev.disallowed.filter((v) => v !== val)
          : [...prev.disallowed, val],
      };
    });
  }

  // Live JSON validation snapshot — drives both validate() and inspector preview
  const jsonValidation = useMemo(
    () => ({
      visual_rules_json: validateJson(values.visual_rules_json),
      motion_rules_json: validateJson(values.motion_rules_json),
      layout_rules_json: validateJson(values.layout_rules_json),
      subtitle_rules_json: validateJson(values.subtitle_rules_json),
      thumbnail_rules_json: validateJson(values.thumbnail_rules_json),
      preview_strategy_json: validateJson(values.preview_strategy_json),
    }),
    [
      values.visual_rules_json,
      values.motion_rules_json,
      values.layout_rules_json,
      values.subtitle_rules_json,
      values.thumbnail_rules_json,
      values.preview_strategy_json,
    ],
  );

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!values.name.trim()) next.name = "Ad zorunlu";

    const versionNum = Number(values.version);
    if (
      values.version.trim() !== "" &&
      (Number.isNaN(versionNum) ||
        !Number.isFinite(versionNum) ||
        versionNum < 0)
    ) {
      next.version = "Versiyon negatif olamaz";
    }

    if (jsonValidation.visual_rules_json)
      next.visual_rules_json = jsonValidation.visual_rules_json;
    if (jsonValidation.motion_rules_json)
      next.motion_rules_json = jsonValidation.motion_rules_json;
    if (jsonValidation.layout_rules_json)
      next.layout_rules_json = jsonValidation.layout_rules_json;
    if (jsonValidation.subtitle_rules_json)
      next.subtitle_rules_json = jsonValidation.subtitle_rules_json;
    if (jsonValidation.thumbnail_rules_json)
      next.thumbnail_rules_json = jsonValidation.thumbnail_rules_json;
    if (jsonValidation.preview_strategy_json)
      next.preview_strategy_json = jsonValidation.preview_strategy_json;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // visual_rules_json: override > disallowed denylist > preset (none here).
    // disallowed list round-trips into visual_rules_json when the operator
    // hasn't supplied a manual override.
    const overrideVisual = values.visual_rules_json.trim();
    let visualJson: string | null = null;
    if (overrideVisual) {
      visualJson = overrideVisual;
    } else if (values.disallowed.length > 0) {
      visualJson = JSON.stringify({ disallowed: values.disallowed });
    }

    mutate(
      {
        name: values.name.trim(),
        module_scope: values.module_scope.trim() || null,
        status: values.status,
        version: values.version.trim() ? Number(values.version) : 1,
        visual_rules_json: visualJson,
        motion_rules_json: buildRulesJson(
          values.motion,
          values.motion_rules_json,
          "motion",
        ),
        layout_rules_json: buildRulesJson(
          values.layout,
          values.layout_rules_json,
          "layout",
        ),
        subtitle_rules_json: buildRulesJson(
          values.subtitle,
          values.subtitle_rules_json,
          "subtitle",
        ),
        thumbnail_rules_json: buildRulesJson(
          values.thumbnail,
          values.thumbnail_rules_json,
          "thumbnail",
        ),
        preview_strategy_json: values.preview_strategy_json.trim() || null,
        notes: values.notes.trim() || null,
      },
      {
        onSuccess: (created) => {
          toast.success("Style blueprint başarıyla oluşturuldu");
          navigate("/admin/style-blueprints", {
            state: { selectedId: created.id },
          });
        },
      },
    );
  }

  // ----- Inspector blocks -------------------------------------------------

  const previewBlock = (label: string, raw: string, err: string | null) => {
    if (!raw.trim() && !err) return null;
    const pretty = safeJsonPretty(raw, "—");
    return (
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 4,
            fontFamily: "var(--font-mono)",
          }}
        >
          {label}
        </div>
        <pre
          style={{
            margin: 0,
            padding: 8,
            background: "var(--bg-inset)",
            border: `1px solid ${err ? "var(--state-danger-border)" : "var(--border-subtle)"}`,
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: 1.5,
            color: err ? "var(--state-danger-fg)" : "var(--text-secondary)",
            maxHeight: 120,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {err ? err : pretty}
        </pre>
      </div>
    );
  };

  const validationErrors = Object.entries(errors).filter(([, v]) => Boolean(v));

  const inspector = (
    <AuroraInspector title="Yeni blueprint">
      <AuroraInspectorSection title="Sayfa amacı">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Görsel kimlik, hareket, layout ve altyazı kurallarını tanımlayın.
          Şablonlarla ilişkilendirilerek render kararlarına yön verir.
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Form özeti">
        <AuroraInspectorRow label="ad" value={values.name.trim() || "—"} />
        <AuroraInspectorRow
          label="scope"
          value={values.module_scope.trim() || "global"}
        />
        <AuroraInspectorRow label="durum" value={values.status || "—"} />
        <AuroraInspectorRow label="versiyon" value={values.version || "1"} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Visual identity preview">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <AuroraStatusChip tone="info">
            motion · {presetLabel(values.motion, MOTION_PRESETS)}
          </AuroraStatusChip>
          <AuroraStatusChip tone="info">
            layout · {presetLabel(values.layout, LAYOUT_PRESETS)}
          </AuroraStatusChip>
          <AuroraStatusChip tone="info">
            subtitle · {presetLabel(values.subtitle, SUBTITLE_PRESETS)}
          </AuroraStatusChip>
          <AuroraStatusChip tone="info">
            thumb · {presetLabel(values.thumbnail, THUMBNAIL_PRESETS)}
          </AuroraStatusChip>
        </div>
        {values.disallowed.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {values.disallowed.map((d) => (
              <AuroraStatusChip key={d} tone="danger">
                ✕ {d}
              </AuroraStatusChip>
            ))}
          </div>
        )}
        <div style={{ ...hintStyle, marginTop: 8 }}>
          Önizleme yalnızca seçilen preset kombinasyonunu gösterir; final render
          ek style blueprint kurallarına bağlıdır.
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="JSON önizleme">
        {previewBlock(
          "visual_rules_json",
          values.visual_rules_json,
          jsonValidation.visual_rules_json,
        )}
        {previewBlock(
          "motion_rules_json",
          values.motion_rules_json,
          jsonValidation.motion_rules_json,
        )}
        {previewBlock(
          "layout_rules_json",
          values.layout_rules_json,
          jsonValidation.layout_rules_json,
        )}
        {previewBlock(
          "subtitle_rules_json",
          values.subtitle_rules_json,
          jsonValidation.subtitle_rules_json,
        )}
        {previewBlock(
          "thumbnail_rules_json",
          values.thumbnail_rules_json,
          jsonValidation.thumbnail_rules_json,
        )}
        {previewBlock(
          "preview_strategy_json",
          values.preview_strategy_json,
          jsonValidation.preview_strategy_json,
        )}
      </AuroraInspectorSection>

      {validationErrors.length > 0 && (
        <AuroraInspectorSection title="Doğrulama hataları">
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--state-danger-fg)",
              lineHeight: 1.6,
            }}
          >
            {validationErrors.map(([k, v]) => (
              <li key={k}>
                <strong style={{ color: "var(--text-secondary)" }}>{k}:</strong>{" "}
                {v}
              </li>
            ))}
          </ul>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  const submitErrorMessage =
    submitError instanceof Error ? submitError.message : null;

  return (
    <div className="aurora-dashboard" data-testid="aurora-style-blueprint-create">
      <AuroraPageShell
        title="Style Blueprint oluştur"
        description="Görsel kimlik, hareket, layout ve altyazı kurallarını tanımlayın."
        breadcrumbs={[
          { label: "Şablonlar" },
          { label: "Style Blueprints", href: "/admin/style-blueprints" },
          { label: "Yeni" },
        ]}
      >
        <div className="card card-pad" style={{ maxWidth: 720 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Field label="Ad" required error={errors.name}>
              <input
                style={
                  errors.name
                    ? { ...inputBaseStyle, ...errorBorderStyle }
                    : inputBaseStyle
                }
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Aurora Dusk · News Bulletin v1"
                autoFocus
                data-testid="aurora-sb-create-name"
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field
                label="Module scope"
                hint="ör. standard_video, news_bulletin (opsiyonel)"
              >
                <select
                  style={selectStyle}
                  value={values.module_scope}
                  onChange={(e) => set("module_scope", e.target.value)}
                >
                  {FAMILY_SUGGESTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f === "" ? "— global —" : f}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Durum">
                <select
                  style={selectStyle}
                  value={values.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {BLUEPRINT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Versiyon" error={errors.version}>
              <input
                type="number"
                min={0}
                style={
                  errors.version
                    ? { ...inputBaseStyle, ...errorBorderStyle }
                    : inputBaseStyle
                }
                value={values.version}
                onChange={(e) => set("version", e.target.value)}
              />
            </Field>

            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 4,
              }}
            >
              <Field label="Motion preset" hint="Hareket karakteri">
                <SegmentedChips
                  value={values.motion}
                  options={MOTION_PRESETS}
                  onChange={(v) => set("motion", v)}
                  testId="aurora-sb-motion"
                />
              </Field>

              <Field label="Layout preset" hint="Kompozisyon yönü">
                <SegmentedChips
                  value={values.layout}
                  options={LAYOUT_PRESETS}
                  onChange={(v) => set("layout", v)}
                  testId="aurora-sb-layout"
                />
              </Field>

              <Field label="Subtitle preset" hint="Altyazı stili">
                <SegmentedChips
                  value={values.subtitle}
                  options={SUBTITLE_PRESETS}
                  onChange={(v) => set("subtitle", v)}
                  testId="aurora-sb-subtitle"
                />
              </Field>

              <Field label="Thumbnail preset" hint="Kapak yönelimi">
                <SegmentedChips
                  value={values.thumbnail}
                  options={THUMBNAIL_PRESETS}
                  onChange={(v) => set("thumbnail", v)}
                  testId="aurora-sb-thumbnail"
                />
              </Field>

              <Field
                label="Disallowed elements"
                hint="Render sırasında izin verilmeyecek öğeler — birden fazla seçilebilir"
              >
                <MultiChips
                  value={values.disallowed}
                  options={DISALLOWED_OPTIONS}
                  onToggle={toggleDisallowed}
                />
              </Field>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 4,
              }}
            >
              <div style={{ ...labelStyle, marginBottom: 10 }}>
                JSON Override (gelişmiş)
              </div>
              <div style={{ ...hintStyle, marginBottom: 12 }}>
                Preset üretimi yeterli olmadığında doğrudan kural JSON'u girin.
                Doluysa preset değerinin üzerine yazılır; canlı doğrulama
                inspector'da görünür.
              </div>

              <Field
                label="visual_rules_json"
                error={errors.visual_rules_json}
              >
                <textarea
                  style={
                    errors.visual_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.visual_rules_json}
                  onChange={(e) => set("visual_rules_json", e.target.value)}
                  placeholder='{"palette": "dusk", "accent": "#9b86ff"}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="motion_rules_json"
                error={errors.motion_rules_json}
              >
                <textarea
                  style={
                    errors.motion_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.motion_rules_json}
                  onChange={(e) => set("motion_rules_json", e.target.value)}
                  placeholder='{"duration_ms": 320, "easing": "ease-out"}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="layout_rules_json"
                error={errors.layout_rules_json}
              >
                <textarea
                  style={
                    errors.layout_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.layout_rules_json}
                  onChange={(e) => set("layout_rules_json", e.target.value)}
                  placeholder='{"grid": "12", "safe_area_pct": 6}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="subtitle_rules_json"
                error={errors.subtitle_rules_json}
              >
                <textarea
                  style={
                    errors.subtitle_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.subtitle_rules_json}
                  onChange={(e) => set("subtitle_rules_json", e.target.value)}
                  placeholder='{"font": "Inter", "size_px": 38}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="thumbnail_rules_json"
                error={errors.thumbnail_rules_json}
              >
                <textarea
                  style={
                    errors.thumbnail_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.thumbnail_rules_json}
                  onChange={(e) => set("thumbnail_rules_json", e.target.value)}
                  placeholder='{"aspect": "16:9", "headline_max_chars": 60}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="preview_strategy_json"
                error={errors.preview_strategy_json}
                hint="Preview üretim stratejisi (opsiyonel)"
              >
                <textarea
                  style={
                    errors.preview_strategy_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.preview_strategy_json}
                  onChange={(e) =>
                    set("preview_strategy_json", e.target.value)
                  }
                  placeholder='{"mode": "still_frame", "frames": ["intro", "lower_third"]}'
                  spellCheck={false}
                />
              </Field>
            </div>

            <Field label="Notlar" hint="Operatör için serbest metin (opsiyonel)">
              <textarea
                style={textareaBaseStyle}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Sürüm gerekçesi, kullanım önerisi…"
                rows={3}
              />
            </Field>

            {submitErrorMessage && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--state-danger-bg)",
                  border: "1px solid var(--state-danger-border)",
                  borderRadius: 6,
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginBottom: 12,
                  wordBreak: "break-word",
                }}
                role="alert"
              >
                {submitErrorMessage}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <AuroraButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigate("/admin/style-blueprints")}
                disabled={isPending}
              >
                İptal
              </AuroraButton>
              <AuroraButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={isPending}
                iconLeft={
                  <Icon name={isPending ? "refresh" : "plus"} size={11} />
                }
              >
                {isPending ? "Kaydediliyor…" : "Oluştur"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
