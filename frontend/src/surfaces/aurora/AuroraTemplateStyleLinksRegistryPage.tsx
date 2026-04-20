/**
 * AuroraTemplateStyleLinksRegistryPage — Aurora Dusk Cockpit /
 * Şablon-Stil Bağlantıları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/
 * template-style-links-registry.html` adapted for the real link data model
 * (`TemplateStyleLinkResponse`).
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Yeni bağlantı" aksiyonu)
 *   - reg-tbl: checkbox · ID (mono) · Şablon (ad + version) · Style Blueprint
 *     (ad + version) · Rol/Scope chip · Durum chip · Güncellenme (relative)
 *   - Inspector: toplam bağlantı, rol dağılımı, en çok bağlı şablon ve
 *     en çok bağlı blueprint
 *   - Row dblclick → /admin/template-style-links/:id
 *   - Bulk delete via useDeleteTemplateStyleLink
 *
 * Veri kaynağı:
 *   - useTemplateStyleLinksList() — gerçek link satırları
 *   - useTemplatesList()          — template adı + version lookup
 *   - useStyleBlueprintsList()    — blueprint adı + version lookup
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.template-style-links.registry` slot'una bağlanır
 * (register.tsx ayrı bir adımda güncellenir).
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTemplateStyleLinksList } from "../../hooks/useTemplateStyleLinksList";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { useDeleteTemplateStyleLink } from "../../hooks/useDeleteTemplateStyleLink";
import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import type { TemplateResponse } from "../../api/templatesApi";
import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { useToast } from "../../hooks/useToast";
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

/**
 * Backend `link_role` alanı bağlantının kapsamını ifade eder:
 *   - null/boş   → "default" (şablonun varsayılan blueprint'i)
 *   - "primary"  → birincil/açık atama
 *   - diğer      → "explicit" (yedek, deneysel vb.)
 */
function scopeLabel(role: string | null | undefined): string {
  const lower = (role ?? "").toLowerCase().trim();
  if (!lower) return "default";
  if (lower === "default") return "default";
  return "explicit";
}

function scopeChipTone(role: string | null | undefined): { bg: string; fg: string } {
  const label = scopeLabel(role);
  if (label === "default") {
    return { bg: "var(--bg-inset)", fg: "var(--text-secondary)" };
  }
  return {
    bg: "var(--accent-primary-muted)",
    fg: "var(--accent-primary-hover)",
  };
}

function statusChipTone(status: string): { bg: string; fg: string } {
  const lower = (status || "").toLowerCase();
  if (lower === "active") {
    return { bg: "var(--state-success-bg)", fg: "var(--state-success-fg)" };
  }
  if (lower === "draft") {
    return { bg: "var(--state-warning-bg)", fg: "var(--state-warning-fg)" };
  }
  if (lower === "archived" || lower === "disabled") {
    return { bg: "var(--bg-inset)", fg: "var(--text-muted)" };
  }
  return { bg: "var(--bg-inset)", fg: "var(--text-secondary)" };
}

function topEntry(map: Map<string, number>): { key: string; count: number } | null {
  let best: { key: string; count: number } | null = null;
  for (const [k, v] of map) {
    if (!best || v > best.count) best = { key: k, count: v };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraTemplateStyleLinksRegistryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: links, isLoading, isError, error } = useTemplateStyleLinksList();
  const { data: templates } = useTemplatesList();
  const { data: blueprints } = useStyleBlueprintsList();

  const list: TemplateStyleLinkResponse[] = links ?? [];

  const templateMap = useMemo(() => {
    const m = new Map<string, TemplateResponse>();
    (templates ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [templates]);

  const blueprintMap = useMemo(() => {
    const m = new Map<string, StyleBlueprintResponse>();
    (blueprints ?? []).forEach((b) => m.set(b.id, b));
    return m;
  }, [blueprints]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const counts = useMemo(() => {
    const scope = { default: 0, explicit: 0 };
    const tplUsage = new Map<string, number>();
    const bpUsage = new Map<string, number>();
    for (const l of list) {
      const sl = scopeLabel(l.link_role);
      if (sl === "default") scope.default += 1;
      else scope.explicit += 1;
      tplUsage.set(l.template_id, (tplUsage.get(l.template_id) ?? 0) + 1);
      bpUsage.set(l.style_blueprint_id, (bpUsage.get(l.style_blueprint_id) ?? 0) + 1);
    }
    return { scope, tplUsage, bpUsage };
  }, [list]);

  const topTpl = topEntry(counts.tplUsage);
  const topBp = topEntry(counts.bpUsage);
  const topTplLabel = topTpl
    ? templateMap.get(topTpl.key)?.name ?? shortId(topTpl.key)
    : "—";
  const topBpLabel = topBp
    ? blueprintMap.get(topBp.key)?.name ?? shortId(topBp.key)
    : "—";

  const deleteMutation = useDeleteTemplateStyleLink();

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    let ok = 0;
    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
        ok += 1;
      } catch {
        // useApiError already surfaces, continue
      }
    }
    if (ok > 0) {
      toast.success(`${ok}/${ids.length} bağlantı silindi`);
    } else {
      toast.error("Silme işlemi başarısız");
    }
    setSelected(new Set());
  }

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
      return new Set(list.map((l) => l.id));
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

  function buildDrawer(idx: number): AuroraDrawerItem {
    const l = list[idx];
    const tpl = templateMap.get(l.template_id);
    const bp = blueprintMap.get(l.style_blueprint_id);
    const scope = scopeLabel(l.link_role);
    const scopeTone = scopeChipTone(l.link_role);
    const stTone = statusChipTone(l.status);
    return {
      breadcrumb: ["Admin", "Şablon-Stil Bağlantıları", shortId(l.id)],
      title: `${tpl?.name ?? shortId(l.template_id)} ↔ ${
        bp?.name ?? shortId(l.style_blueprint_id)
      }`,
      actions: [
        {
          label: "Kopyala ID",
          variant: "ghost",
          onClick: () => {
            void navigator.clipboard?.writeText(l.id);
          },
        },
        {
          label: deleteMutation.isPending ? "Siliniyor…" : "Sil",
          variant: "danger",
          onClick: () => {
            const confirmed = window.confirm(
              `Bu bağlantı silinecek. Bağlı çalışan job'lar etkilenmez ` +
                `(template/blueprint snapshot job başında kilitlendi). ` +
                `Emin misiniz?`,
            );
            if (!confirmed) return;
            void (async () => {
              try {
                await deleteMutation.mutateAsync(l.id);
                toast.success("Bağlantı silindi");
                setDrawerIdx(null);
              } catch {
                // useApiError zaten toast atıyor
              }
            })();
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
              {l.id}
            </span>
          </KvRow>
          <KvRow label="Şablon">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 500 }}>
                {tpl?.name ?? shortId(l.template_id)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}
              >
                v{tpl?.version ?? "—"} · {l.template_id}
              </span>
            </div>
          </KvRow>
          <KvRow label="Style Blueprint">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 500 }}>
                {bp?.name ?? shortId(l.style_blueprint_id)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}
              >
                v{bp?.version ?? "—"} · {l.style_blueprint_id}
              </span>
            </div>
          </KvRow>
          <KvRow label="Rol">
            <span
              className="chip"
              style={{
                fontSize: 10,
                background: scopeTone.bg,
                color: scopeTone.fg,
              }}
              title={l.link_role ?? "default"}
            >
              {scope}
            </span>
          </KvRow>
          <KvRow label="Link role (raw)">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {l.link_role ?? "—"}
            </span>
          </KvRow>
          <KvRow label="Durum">
            <span
              className="chip"
              style={{ fontSize: 10, background: stTone.bg, color: stTone.fg }}
            >
              {l.status || "—"}
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
              {timeAgo(l.created_at)} önce
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
              {timeAgo(l.updated_at)} önce
            </span>
          </KvRow>
        </div>
      ),
    };
  }

  const inspector = (
    <AuroraInspector title="Bağlantılar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(list.length)} />
        <AuroraInspectorRow label="default" value={String(counts.scope.default)} />
        <AuroraInspectorRow label="explicit" value={String(counts.scope.explicit)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="En çok bağlı">
        <AuroraInspectorRow
          label="şablon"
          value={topTpl ? `${topTplLabel} (${topTpl.count})` : "—"}
        />
        <AuroraInspectorRow
          label="blueprint"
          value={topBp ? `${topBpLabel} (${topBp.count})` : "—"}
        />
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
          <div style={{ marginTop: 8 }}>
            <AuroraButton
              variant="danger"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleBulkDelete}
              iconLeft={<Icon name="trash" size={11} />}
            >
              Seçilenleri sil
            </AuroraButton>
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Şablon-Stil Bağlantıları</h1>
            <div className="sub">
              {list.length} bağlantı · şablon ↔ blueprint eşleştirmeleri
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/template-style-links/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni bağlantı
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
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Henüz bağlantı yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/template-style-links/new")}
            >
              İlk bağlantıyı oluştur →
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
                      checked={selected.size === list.length && list.length > 0}
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Şablon</th>
                  <th>Style Blueprint</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>Güncellenme</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l, idx) => {
                  const tpl = templateMap.get(l.template_id);
                  const bp = blueprintMap.get(l.style_blueprint_id);
                  const isSel = selected.has(l.id);
                  const scope = scopeLabel(l.link_role);
                  const scopeTone = scopeChipTone(l.link_role);
                  const stTone = statusChipTone(l.status);
                  return (
                    <tr
                      key={l.id}
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
                          onChange={() => toggleRow(l.id)}
                          aria-label={`${shortId(l.id)} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(l.id)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {tpl?.name ?? shortId(l.template_id)}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--text-muted)",
                            }}
                          >
                            v{tpl?.version ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {bp?.name ?? shortId(l.style_blueprint_id)}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--text-muted)",
                            }}
                          >
                            v{bp?.version ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            background: scopeTone.bg,
                            color: scopeTone.fg,
                          }}
                          title={l.link_role ?? "default"}
                        >
                          {scope}
                        </span>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            background: stTone.bg,
                            color: stTone.fg,
                          }}
                        >
                          {l.status || "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          textAlign: "right",
                        }}
                      >
                        {timeAgo(l.updated_at)} önce
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
