/**
 * AuroraTemplateStyleLinkCreatePage — admin template ↔ style blueprint
 * bağlantı oluşturma yüzeyi (Aurora).
 *
 * Legacy `pages/admin/TemplateStyleLinkCreatePage.tsx` ile aynı backend
 * akışı: useCreateTemplateStyleLink → POST /template-style-links.
 *
 * Aurora iyileştirmeleri:
 *   - Template ve Style Blueprint ID'leri serbest input yerine canlı liste
 *     dropdown'ı (useTemplatesList + useStyleBlueprintsList).
 *   - İlişki rolü ve durum chip butonları.
 *   - Inspector: seçilen template + blueprint özetini gösterir.
 */

import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuroraPageShell,
  AuroraCard,
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
  AuroraSegmented,
} from "./primitives";
import { useCreateTemplateStyleLink } from "../../hooks/useCreateTemplateStyleLink";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { useToast } from "../../hooks/useToast";
import { LINK_ROLES, LINK_STATUSES } from "../../constants/statusOptions";

const FIELD_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 6,
};

const INPUT_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--border-default)",
  borderRadius: 6,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};

const ROLE_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  primary: "success",
  fallback: "info",
  experimental: "warning",
};

const STATUS_TONE: Record<string, "success" | "neutral" | "danger"> = {
  active: "success",
  inactive: "neutral",
  archived: "danger",
};

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? `…${id.slice(-8)}` : id;
}

export function AuroraTemplateStyleLinkCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const templatesQuery = useTemplatesList();
  const blueprintsQuery = useStyleBlueprintsList();
  const { mutate, isPending, error } = useCreateTemplateStyleLink();

  const [templateId, setTemplateId] = useState("");
  const [blueprintId, setBlueprintId] = useState("");
  const [linkRole, setLinkRole] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [notes, setNotes] = useState("");

  const templates = templatesQuery.data ?? [];
  const blueprints = blueprintsQuery.data ?? [];

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );
  const selectedBlueprint = useMemo(
    () => blueprints.find((b) => b.id === blueprintId) ?? null,
    [blueprints, blueprintId],
  );

  const canSubmit = templateId.trim().length > 0 && blueprintId.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    mutate(
      {
        template_id: templateId.trim(),
        style_blueprint_id: blueprintId.trim(),
        link_role: linkRole.trim() || null,
        status,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (created) => {
          toast.success("Şablon-stil bağlantısı başarıyla oluşturuldu");
          navigate("/admin/template-style-links", {
            state: { selectedId: created.id },
          });
        },
      },
    );
  }

  const inspector = (
    <AuroraInspector title="Bağlantı özeti">
      <AuroraInspectorSection title="Şablon">
        {selectedTemplate ? (
          <>
            <AuroraInspectorRow label="ad" value={selectedTemplate.name} />
            <AuroraInspectorRow label="tip" value={selectedTemplate.template_type} />
            <AuroraInspectorRow
              label="kapsam"
              value={selectedTemplate.module_scope ?? "global"}
            />
            <AuroraInspectorRow
              label="durum"
              value={
                <AuroraStatusChip
                  tone={selectedTemplate.status === "active" ? "success" : "neutral"}
                >
                  {selectedTemplate.status}
                </AuroraStatusChip>
              }
            />
            <AuroraInspectorRow label="versiyon" value={`v${selectedTemplate.version}`} />
          </>
        ) : (
          <AuroraInspectorRow label="seçim" value="—" />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Stil Blueprint">
        {selectedBlueprint ? (
          <>
            <AuroraInspectorRow label="ad" value={selectedBlueprint.name} />
            <AuroraInspectorRow
              label="kapsam"
              value={selectedBlueprint.module_scope ?? "global"}
            />
            <AuroraInspectorRow
              label="durum"
              value={
                <AuroraStatusChip
                  tone={selectedBlueprint.status === "active" ? "success" : "neutral"}
                >
                  {selectedBlueprint.status}
                </AuroraStatusChip>
              }
            />
            <AuroraInspectorRow
              label="versiyon"
              value={`v${selectedBlueprint.version}`}
            />
          </>
        ) : (
          <AuroraInspectorRow label="seçim" value="—" />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="İlişki">
        <AuroraInspectorRow
          label="rol"
          value={
            linkRole ? (
              <AuroraStatusChip tone={ROLE_TONE[linkRole] ?? "neutral"}>
                {linkRole}
              </AuroraStatusChip>
            ) : (
              "—"
            )
          }
        />
        <AuroraInspectorRow
          label="durum"
          value={
            <AuroraStatusChip tone={STATUS_TONE[status] ?? "neutral"}>
              {status}
            </AuroraStatusChip>
          }
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-tsl-create">
      <AuroraPageShell
        title="Yeni Şablon-Stil Bağlantısı"
        description="Bir içerik şablonunu bir stil blueprint'ine bağlayın; rol ve durum atayın."
        breadcrumbs={[
          { label: "Şablon-Stil Bağlantıları", href: "/admin/template-style-links" },
          { label: "Yeni" },
        ]}
        actions={
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/template-style-links")}
          >
            Vazgeç
          </AuroraButton>
        }
      >
        <AuroraCard pad="default">
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <span style={FIELD_LABEL}>
                Şablon <span style={{ color: "var(--state-danger-fg, #f87171)" }}>*</span>
              </span>
              <select
                style={INPUT_STYLE}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templatesQuery.isLoading}
                data-testid="aurora-tsl-template-select"
              >
                <option value="">— Şablon seçin —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.template_type} · v{t.version}
                  </option>
                ))}
              </select>
              {templatesQuery.isLoading && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                  Şablonlar yükleniyor…
                </p>
              )}
            </div>

            <div>
              <span style={FIELD_LABEL}>
                Stil Blueprint{" "}
                <span style={{ color: "var(--state-danger-fg, #f87171)" }}>*</span>
              </span>
              <select
                style={INPUT_STYLE}
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                disabled={blueprintsQuery.isLoading}
                data-testid="aurora-tsl-blueprint-select"
              >
                <option value="">— Blueprint seçin —</option>
                {blueprints.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.module_scope ?? "global"} · v{b.version}
                  </option>
                ))}
              </select>
              {blueprintsQuery.isLoading && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                  Blueprint'ler yükleniyor…
                </p>
              )}
            </div>

            <div>
              <span style={FIELD_LABEL}>İlişki Rolü</span>
              <AuroraSegmented
                value={linkRole}
                onChange={setLinkRole}
                options={[
                  { value: "", label: "—" },
                  ...LINK_ROLES.map((r) => ({ value: r, label: r })),
                ]}
                data-testid="aurora-tsl-link-role"
              />
            </div>

            <div>
              <span style={FIELD_LABEL}>Durum</span>
              <AuroraSegmented
                value={status}
                onChange={setStatus}
                options={LINK_STATUSES.map((s) => ({ value: s, label: s }))}
                data-testid="aurora-tsl-status"
              />
            </div>

            <div>
              <span style={FIELD_LABEL}>Notlar</span>
              <textarea
                style={{ ...INPUT_STYLE, minHeight: 70, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsiyonel açıklama (örn. neden bu rol verildi, hangi job kapsamında geçerli vb.)"
              />
            </div>

            {error ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--state-danger-fg, #f87171)",
                  background: "var(--state-danger-bg, rgba(248,113,113,0.08))",
                  border: "1px solid var(--state-danger-border, rgba(248,113,113,0.3))",
                  borderRadius: 6,
                  padding: "8px 10px",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {error instanceof Error ? error.message : String(error)}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 4,
              }}
            >
              <AuroraButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/template-style-links")}
                disabled={isPending}
              >
                İptal
              </AuroraButton>
              <AuroraButton
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit || isPending}
                data-testid="aurora-tsl-submit"
              >
                {isPending ? "Kaydediliyor…" : "Bağlantıyı Oluştur"}
              </AuroraButton>
            </div>
          </div>
        </AuroraCard>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

// Note: local ChipGroup removed in wave 2 — replaced by AuroraSegmented.
// Parallel component pattern was duplicating primitive functionality.
