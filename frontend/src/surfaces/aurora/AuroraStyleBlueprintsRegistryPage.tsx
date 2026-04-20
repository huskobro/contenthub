/**
 * AuroraStyleBlueprintsRegistryPage — Aurora Dusk Cockpit / Style Blueprint
 * Kayıtları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/
 * style-blueprints-registry.html` adapted for the real Style Blueprint
 * data model (`StyleBlueprintResponse`).
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Yeni style blueprint" aksiyonu)
 *   - reg-tbl: checkbox · ID (mono) · Ad · Family · Owner (chip) · Versiyon ·
 *     Görsel kimlik özeti (motion + layout chip stack) · Job kullanımı ·
 *     Güncellendi
 *   - Inspector: toplam blueprint, family count, version count, en aktif
 *     blueprint
 *   - Row dblclick → /admin/style-blueprints/:id
 *
 * Veri kaynağı: useStyleBlueprintsList() — gerçek StyleBlueprintResponse[].
 * "Job kullanımı" sayısı useJobsList(true) içindeki source_context_json'dan
 * style_blueprint_id eşleşmesi parse edilerek türetilir (backend'de henüz
 * dedicated `usage_count` alanı yok — analytics henüz aggregate çıkmıyor).
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.style-blueprints.registry` slot'una bağlanır (register.tsx
 * tarafımdan değişmez — kayıt ayrı bir adımda yapılır).
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { useJobsList } from "../../hooks/useJobsList";
import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import type { JobResponse } from "../../api/jobsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraDetailDrawer,
  type AuroraDrawerItem,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

function familyLabel(scope: string | null): string {
  if (!scope) return "global";
  return scope;
}

/**
 * Owner-style chip: blueprints have no `created_by` field at the data layer
 * (Phase 21 yet). Status acts as origin signal:
 *   - "active"   → admin-yönetilen, üretimde
 *   - "draft"    → admin draft
 *   - "archived" → admin arşiv
 *   - other      → "system"
 */
function ownerChipLabel(status: string): string {
  const lower = (status || "").toLowerCase();
  if (lower === "active") return "admin · aktif";
  if (lower === "draft") return "admin · taslak";
  if (lower === "archived") return "admin · arşiv";
  return "system";
}

function ownerChipTone(status: string): { bg: string; fg: string } {
  const lower = (status || "").toLowerCase();
  if (lower === "active") {
    return { bg: "var(--state-success-bg)", fg: "var(--state-success-fg)" };
  }
  if (lower === "draft") {
    return { bg: "var(--state-warning-bg)", fg: "var(--state-warning-fg)" };
  }
  if (lower === "archived") {
    return { bg: "var(--bg-inset)", fg: "var(--text-muted)" };
  }
  return { bg: "var(--bg-inset)", fg: "var(--text-secondary)" };
}

/**
 * Visual identity summary — küçük chip stack:
 *   - motion özeti (motion_rules_json içindeki "style"/"intensity" alanı)
 *   - layout direction (layout_rules_json içindeki "direction"/"orientation")
 *
 * JSON parse hatasında ya da alan yoksa chip atlanır. Asla full-render kod
 * üretmiyoruz — sadece okunabilir özet.
 */
interface VisualSummary {
  motion: string | null;
  layoutDir: string | null;
}

function pickFirstString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function summarizeVisual(bp: StyleBlueprintResponse): VisualSummary {
  const motion = pickFirstString(safeParse(bp.motion_rules_json), [
    "style",
    "intensity",
    "tone",
    "name",
  ]);
  const layoutDir = pickFirstString(safeParse(bp.layout_rules_json), [
    "direction",
    "orientation",
    "layout",
    "composition",
  ]);
  return { motion, layoutDir };
}

/**
 * Job kullanımı — source_context_json içinden style_blueprint_id eşleşmesi
 * sayar. Backend tarafında dedicated aggregate endpoint olmadığı için
 * istemci tarafında türetiyoruz; data set küçük olduğu için maliyet
 * ihmal edilebilir.
 */
function buildUsageMap(jobs: JobResponse[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const j of jobs) {
    const ctx = safeParse(j.source_context_json);
    const id = pickFirstString(ctx, ["style_blueprint_id"]);
    if (!id) continue;
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraStyleBlueprintsRegistryPage() {
  const navigate = useNavigate();

  const {
    data: blueprints,
    isLoading,
    isError,
    error,
  } = useStyleBlueprintsList();
  const { data: jobs } = useJobsList(true);

  const list = blueprints ?? [];
  const jobsList = jobs ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const usageMap = useMemo(() => buildUsageMap(jobsList), [jobsList]);

  const stats = useMemo(() => {
    const families = new Set<string>();
    const versionTotal = new Set<string>(); // (id+version) — distinct version snapshots
    let topId: string | null = null;
    let topUsage = -1;
    for (const bp of list) {
      families.add(familyLabel(bp.module_scope));
      versionTotal.add(`${bp.id}@${bp.version}`);
      const u = usageMap.get(bp.id) ?? 0;
      if (u > topUsage) {
        topUsage = u;
        topId = bp.id;
      }
    }
    const top = topId ? list.find((b) => b.id === topId) ?? null : null;
    return {
      total: list.length,
      familyCount: families.size,
      versionCount: versionTotal.size,
      topName: top ? top.name : "—",
      topUsage: top ? Math.max(0, topUsage) : 0,
    };
  }, [list, usageMap]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === list.length) return new Set();
      return new Set(list.map((b) => b.id));
    });
  }

  function KvRow({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 12,
          padding: "8px 0",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {label}
        </div>
        <div style={{ color: "var(--text-primary)" }}>{children}</div>
      </div>
    );
  }

  function jsonPreview(label: string, raw: string | null): ReactNode {
    if (!raw) return null;
    let pretty = raw;
    try {
      pretty = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // leave as-is
    }
    return (
      <details style={{ marginTop: 6 }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {label}
        </summary>
        <pre
          style={{
            marginTop: 6,
            background: "var(--bg-inset)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            padding: 8,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            maxHeight: 240,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {pretty}
        </pre>
      </details>
    );
  }

  function buildDrawer(idx: number): AuroraDrawerItem {
    const bp = list[idx];
    const tone = ownerChipTone(bp.status);
    const summary = summarizeVisual(bp);
    const usage = usageMap.get(bp.id) ?? 0;
    return {
      breadcrumb: ["Admin", "Style blueprints", shortId(bp.id)],
      title: bp.name,
      actions: [
        {
          label: "Kopyala ID",
          variant: "ghost",
          onClick: () => {
            void navigator.clipboard?.writeText(bp.id);
          },
        },
      ],
      children: (
        <div>
          <KvRow label="ID">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--accent-primary-hover)",
              }}
            >
              {bp.id}
            </span>
          </KvRow>
          <KvRow label="Ad">{bp.name}</KvRow>
          <KvRow label="Family">
            <span
              className="chip"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              {familyLabel(bp.module_scope)}
            </span>
          </KvRow>
          <KvRow label="Owner">
            <span
              className="chip"
              style={{ fontSize: 10, background: tone.bg, color: tone.fg }}
            >
              {ownerChipLabel(bp.status)}
            </span>
          </KvRow>
          <KvRow label="Versiyon">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              v{bp.version}
            </span>
          </KvRow>
          <KvRow label="Görsel kimlik">
            <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
              {summary.motion && (
                <span
                  className="chip"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  motion · {summary.motion}
                </span>
              )}
              {summary.layoutDir && (
                <span
                  className="chip"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  layout · {summary.layoutDir}
                </span>
              )}
              {!summary.motion && !summary.layoutDir && (
                <span style={{ color: "var(--text-muted)" }}>—</span>
              )}
            </span>
          </KvRow>
          <KvRow label="Job kullanımı">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {usage}
            </span>
          </KvRow>
          <KvRow label="Eklenme">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {timeAgo(bp.created_at)} önce
            </span>
          </KvRow>
          <KvRow label="Güncellenme">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {timeAgo(bp.updated_at)} önce
            </span>
          </KvRow>
          {bp.notes && <KvRow label="Notlar">{bp.notes}</KvRow>}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                marginBottom: 4,
              }}
            >
              KURAL JSON ÖNİZLEMELERİ
            </div>
            {jsonPreview("visual_rules_json", bp.visual_rules_json)}
            {jsonPreview("motion_rules_json", bp.motion_rules_json)}
            {jsonPreview("layout_rules_json", bp.layout_rules_json)}
            {jsonPreview("subtitle_rules_json", bp.subtitle_rules_json)}
            {jsonPreview("thumbnail_rules_json", bp.thumbnail_rules_json)}
            {jsonPreview("preview_strategy_json", bp.preview_strategy_json)}
          </div>
        </div>
      ),
    };
  }

  const inspector = (
    <AuroraInspector title="Blueprints">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(stats.total)} />
        <AuroraInspectorRow
          label="family"
          value={String(stats.familyCount)}
        />
        <AuroraInspectorRow
          label="versiyon"
          value={String(stats.versionCount)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="En aktif">
        <AuroraInspectorRow label="blueprint" value={stats.topName} />
        <AuroraInspectorRow
          label="job kullanımı"
          value={String(stats.topUsage)}
        />
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Style blueprints</h1>
            <div className="sub">
              {list.length} blueprint · görsel kimlik & pipeline kuralları
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/style-blueprints/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni style blueprint
            </AuroraButton>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Henüz style blueprint yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/style-blueprints/new")}
            >
              İlk blueprint'i oluştur →
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={
                        selected.size === list.length && list.length > 0
                      }
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Family</th>
                  <th>Owner</th>
                  <th style={{ textAlign: "right" }}>Versiyon</th>
                  <th>Görsel kimlik özeti</th>
                  <th style={{ textAlign: "right" }}>Job kullanımı</th>
                  <th>Güncellendi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((bp, idx) => {
                  const isSel = selected.has(bp.id);
                  const tone = ownerChipTone(bp.status);
                  const summary = summarizeVisual(bp);
                  const usage = usageMap.get(bp.id) ?? 0;
                  return (
                    <tr
                      key={bp.id}
                      onClick={() => setDrawerIdx(idx)}
                      onDoubleClick={() => setDrawerIdx(idx)}
                      style={{
                        cursor: "pointer",
                        background: isSel ? "var(--bg-inset)" : undefined,
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(bp.id)}
                          aria-label={`${bp.name} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(bp.id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{bp.name}</td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {familyLabel(bp.module_scope)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            background: tone.bg,
                            color: tone.fg,
                          }}
                        >
                          {ownerChipLabel(bp.status)}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        v{bp.version}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            gap: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {summary.motion && (
                            <span
                              className="chip"
                              style={{
                                fontSize: 10,
                                fontFamily: "var(--font-mono)",
                              }}
                              title={`motion: ${summary.motion}`}
                            >
                              motion · {summary.motion}
                            </span>
                          )}
                          {summary.layoutDir && (
                            <span
                              className="chip"
                              style={{
                                fontSize: 10,
                                fontFamily: "var(--font-mono)",
                              }}
                              title={`layout: ${summary.layoutDir}`}
                            >
                              layout · {summary.layoutDir}
                            </span>
                          )}
                          {!summary.motion && !summary.layoutDir && (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                              }}
                            >
                              —
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color:
                            usage > 0
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                        }}
                      >
                        {usage}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(bp.updated_at)} önce
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
      <AuroraDetailDrawer
        item={drawerIdx !== null ? buildDrawer(drawerIdx) : null}
        onClose={() => setDrawerIdx(null)}
      />
    </div>
  );
}
