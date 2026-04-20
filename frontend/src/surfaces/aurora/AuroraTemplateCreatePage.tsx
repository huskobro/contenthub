/**
 * AuroraTemplateCreatePage — Aurora Dusk Cockpit / Şablon oluştur (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/template-create.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık)
 *   - Form: name, family/module_scope, template_type (style/content/publish),
 *     owner_scope (system/admin/user), description, version, status,
 *     style_profile_json + content_rules_json + publish_profile_json textarea'ları
 *   - Inspector: JSON preview + validasyon hataları + version bilgisi
 *   - Submit: createTemplate mutation -> /admin/templates redirect
 *
 * Veri kaynağı: createTemplate mutation (useCreateTemplate).
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.templates.create` slot'una bağlanır (register.tsx — bu task kapsamı
 * dışı; trampoline mevcut zaten override yoksa null döner).
 */
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTemplate } from "../../hooks/useCreateTemplate";
import { useToast } from "../../hooks/useToast";
import { validateJson, safeJsonPretty } from "../../lib/safeJson";
import {
  TEMPLATE_TYPES,
  OWNER_SCOPES,
  TEMPLATE_STATUSES,
} from "../../constants/statusOptions";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

interface FormValues {
  name: string;
  template_type: string;
  owner_scope: string;
  module_scope: string;
  description: string;
  status: string;
  version: string;
  style_profile_json: string;
  content_rules_json: string;
  publish_profile_json: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

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
  minHeight: 110,
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
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraTemplateCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error: submitError } = useCreateTemplate();

  const [values, setValues] = useState<FormValues>({
    name: "",
    template_type: "style",
    owner_scope: "admin",
    module_scope: "",
    description: "",
    status: "draft",
    version: "1",
    style_profile_json: "",
    content_rules_json: "",
    publish_profile_json: "",
    notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // Live JSON validation snapshot (used by both validate() and inspector preview)
  const jsonValidation = useMemo(() => {
    return {
      style_profile_json: validateJson(values.style_profile_json),
      content_rules_json: validateJson(values.content_rules_json),
      publish_profile_json: validateJson(values.publish_profile_json),
    };
  }, [
    values.style_profile_json,
    values.content_rules_json,
    values.publish_profile_json,
  ]);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Ad zorunlu";
    if (!values.template_type.trim()) next.template_type = "Tür zorunlu";
    if (!values.owner_scope.trim()) next.owner_scope = "Owner scope zorunlu";

    const versionNum = Number(values.version);
    if (
      values.version.trim() !== "" &&
      (Number.isNaN(versionNum) || !Number.isFinite(versionNum) || versionNum < 0)
    ) {
      next.version = "Versiyon negatif olamaz";
    }

    if (jsonValidation.style_profile_json) {
      next.style_profile_json = jsonValidation.style_profile_json;
    }
    if (jsonValidation.content_rules_json) {
      next.content_rules_json = jsonValidation.content_rules_json;
    }
    if (jsonValidation.publish_profile_json) {
      next.publish_profile_json = jsonValidation.publish_profile_json;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutate(
      {
        name: values.name.trim(),
        template_type: values.template_type,
        owner_scope: values.owner_scope,
        module_scope: values.module_scope.trim() || null,
        description: values.description.trim() || null,
        status: values.status,
        version: values.version.trim() ? Number(values.version) : 1,
        style_profile_json: values.style_profile_json.trim() || null,
        content_rules_json: values.content_rules_json.trim() || null,
        publish_profile_json: values.publish_profile_json.trim() || null,
      },
      {
        onSuccess: (created) => {
          toast.success("Şablon oluşturuldu");
          // Detail route mevcut değil — registry sayfasına dön ve yeni
          // şablonu drawer içinde aç (?openId= deep-link).
          navigate(`/admin/templates?openId=${created.id}`);
        },
      },
    );
  }

  // Inspector — JSON önizleme + validasyon hataları + versiyon bilgisi
  const previewBlock = (label: string, raw: string, err: string | null) => {
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
            maxHeight: 140,
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
    <AuroraInspector title="Yeni şablon">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="ad" value={values.name.trim() || "—"} />
        <AuroraInspectorRow label="tip" value={values.template_type || "—"} />
        <AuroraInspectorRow label="owner" value={values.owner_scope || "—"} />
        <AuroraInspectorRow
          label="aile"
          value={values.module_scope.trim() || "global"}
        />
        <AuroraInspectorRow label="versiyon" value={values.version || "1"} />
        <AuroraInspectorRow label="durum" value={values.status || "—"} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="JSON önizleme">
        {previewBlock(
          "style_profile_json",
          values.style_profile_json,
          jsonValidation.style_profile_json,
        )}
        {previewBlock(
          "content_rules_json",
          values.content_rules_json,
          jsonValidation.content_rules_json,
        )}
        {previewBlock(
          "publish_profile_json",
          values.publish_profile_json,
          jsonValidation.publish_profile_json,
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

      <AuroraInspectorSection title="İpucu">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Tüm zorunlu alanları doldurun. Şablon kaydedildikten sonra düzenlenebilir
          ve blueprint'lere bağlanabilir. Versiyon kilitlenince koşmakta olan job'lar
          etkilenmez.
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  const submitErrorMessage =
    submitError instanceof Error ? submitError.message : null;

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Şablon oluştur</h1>
            <div className="sub">
              İçerik, stil veya yayın şablonu — blueprint'lerle ilişkilendirilerek
              görsel kurallar belirlenir.
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/templates")}
              disabled={isPending}
            >
              İptal
            </AuroraButton>
          </div>
        </div>

        <div className="card card-pad">
          <form onSubmit={handleSubmit} noValidate>
            <Field label="Şablon adı" required error={errors.name}>
              <input
                style={errors.name ? { ...inputBaseStyle, ...errorBorderStyle } : inputBaseStyle}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Haftalık haber bülteni v4"
                data-testid="aurora-tpl-create-name"
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Tür" required error={errors.template_type}>
                <select
                  style={
                    errors.template_type
                      ? { ...selectStyle, ...errorBorderStyle }
                      : selectStyle
                  }
                  value={values.template_type}
                  onChange={(e) => set("template_type", e.target.value)}
                >
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Owner scope" required error={errors.owner_scope}>
                <select
                  style={
                    errors.owner_scope
                      ? { ...selectStyle, ...errorBorderStyle }
                      : selectStyle
                  }
                  value={values.owner_scope}
                  onChange={(e) => set("owner_scope", e.target.value)}
                >
                  {OWNER_SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field
                label="Aile (module_scope)"
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
                  {TEMPLATE_STATUSES.map((s) => (
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
                style={errors.version ? { ...inputBaseStyle, ...errorBorderStyle } : inputBaseStyle}
                value={values.version}
                onChange={(e) => set("version", e.target.value)}
              />
            </Field>

            <Field label="Açıklama">
              <textarea
                style={textareaBaseStyle}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Bu şablonun amacı ve kullanım senaryosu..."
                rows={3}
              />
            </Field>

            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 4,
              }}
            >
              <Field
                label="style_profile_json"
                error={errors.style_profile_json}
                hint="JSON gövdesi (Monaco yok — düz textarea, validasyon canlı çalışır)"
              >
                <textarea
                  style={
                    errors.style_profile_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.style_profile_json}
                  onChange={(e) => set("style_profile_json", e.target.value)}
                  placeholder='{"color": "#0d0818"}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="content_rules_json"
                error={errors.content_rules_json}
              >
                <textarea
                  style={
                    errors.content_rules_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.content_rules_json}
                  onChange={(e) => set("content_rules_json", e.target.value)}
                  placeholder='{"max_items": 5}'
                  spellCheck={false}
                />
              </Field>

              <Field
                label="publish_profile_json"
                error={errors.publish_profile_json}
              >
                <textarea
                  style={
                    errors.publish_profile_json
                      ? { ...monoTextareaStyle, ...errorBorderStyle }
                      : monoTextareaStyle
                  }
                  value={values.publish_profile_json}
                  onChange={(e) => set("publish_profile_json", e.target.value)}
                  placeholder='{"platform": "youtube"}'
                  spellCheck={false}
                />
              </Field>
            </div>

            <Field label="Notlar" hint="Operatör için serbest metin (opsiyonel)">
              <textarea
                style={textareaBaseStyle}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Değişiklik gerekçesi, sürüm notları..."
                rows={2}
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
                onClick={() => navigate("/admin/templates")}
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
                  isPending ? (
                    <Icon name="refresh" size={11} />
                  ) : (
                    <Icon name="plus" size={11} />
                  )
                }
              >
                {isPending ? "Kaydediliyor…" : "Oluştur"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
