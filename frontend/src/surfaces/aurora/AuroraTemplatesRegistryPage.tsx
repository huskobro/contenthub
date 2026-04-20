/**
 * AuroraTemplatesRegistryPage — Aurora Dusk Cockpit / Şablon Kayıtları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/templates-registry.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + arama + "Yeni şablon" aksiyonu)
 *   - reg-tbl ID/Ad/Family/Owner/Versiyon/Job kullanımı/Durum/Güncelleme kolonları
 *   - Owner chip (system/admin/user), durum chip, mono ID/version/relative time
 *   - Inspector: Toplam template, family dağılımı, owner sayıları, en çok
 *     kullanılan template, version locked count
 *
 * Veri kaynağı: useTemplatesList() — gerçek TemplateResponse[].
 * Job kullanımı: useTemplateImpact("7d") -> template_stats[].total_jobs.
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.templates.registry` slot'una kayıtlı.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useTemplateImpact } from "../../hooks/useTemplateImpact";
import type { TemplateResponse } from "../../api/templatesApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraDetailDrawer,
  type AuroraDrawerItem,
} from "./primitives";
import { Icon } from "./icons";

type StatusKey = "active" | "draft" | "archived" | "deprecated" | "unknown";

const STATUS_TONE: Record<StatusKey, { color: string; label: string }> = {
  active: { color: "var(--state-success-fg)", label: "active" },
  draft: { color: "var(--state-warning-fg)", label: "draft" },
  archived: { color: "var(--text-muted)", label: "archived" },
  deprecated: { color: "var(--text-muted)", label: "deprecated" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

const OWNER_TONE: Record<string, { bg: string; fg: string }> = {
  system: { bg: "rgba(99,102,241,0.12)", fg: "var(--accent-primary-hover)" },
  admin: { bg: "rgba(34,197,94,0.12)", fg: "var(--state-success-fg)" },
  user: { bg: "rgba(245,158,11,0.12)", fg: "var(--state-warning-fg)" },
};

function deriveStatus(s: string | null | undefined): StatusKey {
  const v = (s ?? "").toLowerCase();
  if (v === "active") return "active";
  if (v === "draft") return "draft";
  if (v === "archived") return "archived";
  if (v === "deprecated") return "deprecated";
  return "unknown";
}

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

function family(t: TemplateResponse): string {
  return t.module_scope ?? t.template_type ?? "global";
}

export function AuroraTemplatesRegistryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: templates, isLoading, isError, error } = useTemplatesList();
  const { data: impact } = useTemplateImpact("last_7d");

  const list = useMemo(() => templates ?? [], [templates]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  // template_id -> total_jobs map (last 7d)
  const usageById = useMemo(() => {
    const m = new Map<string, number>();
    for (const stat of impact?.template_stats ?? []) {
      if (stat.template_id) m.set(stat.template_id, stat.total_jobs);
    }
    return m;
  }, [impact]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      return (
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.template_type ?? "").toLowerCase().includes(q) ||
        (t.module_scope ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [list, search]);

  // Deep-link: ?openId=<template_id> → drawer'ı otomatik aç (ör. create
  // sonrası "yeni şablon"a redirect için). Param tüketildikten sonra URL'den
  // temizlenir, geri/forward gezintilerde yeniden tetiklenmez.
  useEffect(() => {
    const openId = searchParams.get("openId");
    if (!openId || filtered.length === 0) return;
    const idx = filtered.findIndex((t) => t.id === openId);
    if (idx >= 0) {
      setDrawerIdx(idx);
      const next = new URLSearchParams(searchParams);
      next.delete("openId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, filtered, setSearchParams]);

  const counts = useMemo(() => {
    const c = {
      total: list.length,
      active: 0,
      draft: 0,
      archived: 0,
      versionLocked: 0,
      ownerSystem: 0,
      ownerAdmin: 0,
      ownerUser: 0,
    };
    for (const t of list) {
      const st = deriveStatus(t.status);
      if (st === "active") c.active += 1;
      else if (st === "draft") c.draft += 1;
      else if (st === "archived" || st === "deprecated") c.archived += 1;
      if ((t.version ?? 0) > 1) c.versionLocked += 1;
      const owner = (t.owner_scope ?? "").toLowerCase();
      if (owner === "system") c.ownerSystem += 1;
      else if (owner === "admin") c.ownerAdmin += 1;
      else if (owner === "user") c.ownerUser += 1;
    }
    return c;
  }, [list]);

  const familyDistribution = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of list) {
      const f = family(t);
      m.set(f, (m.get(f) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [list]);

  const topUsed = useMemo(() => {
    let bestId: string | null = null;
    let bestUses = 0;
    let bestName: string | null = null;
    for (const t of list) {
      const uses = usageById.get(t.id) ?? 0;
      if (uses > bestUses) {
        bestUses = uses;
        bestId = t.id;
        bestName = t.name;
      }
    }
    return bestId ? { id: bestId, name: bestName ?? bestId, uses: bestUses } : null;
  }, [list, usageById]);

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
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((t) => t.id));
    });
  }

  function statusPill(s: StatusKey): ReactNode {
    const tone = STATUS_TONE[s];
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: tone.color,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: tone.color,
            boxShadow: `0 0 5px ${tone.color}`,
          }}
        />
        {tone.label}
      </span>
    );
  }

  function ownerPill(scope: string | null | undefined): ReactNode {
    const key = (scope ?? "").toLowerCase();
    const tone = OWNER_TONE[key] ?? {
      bg: "var(--bg-inset)",
      fg: "var(--text-muted)",
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 7px",
          borderRadius: 4,
          background: tone.bg,
          color: tone.fg,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textTransform: "lowercase",
        }}
      >
        {scope ?? "—"}
      </span>
    );
  }

  function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 8,
          padding: "4px 0",
          fontSize: 12,
        }}
      >
        <div
          style={{
            color: "var(--text-muted)",
            textTransform: "lowercase",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {label}
        </div>
        <div style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    );
  }

  function prettyJson(value: unknown): string {
    if (value === null || value === undefined) return "—";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function buildDrawer(idx: number): AuroraDrawerItem | null {
    const t = filtered[idx];
    if (!t) return null;
    const status = deriveStatus(t.status);
    const fam = family(t);
    const uses = usageById.get(t.id) ?? 0;
    return {
      title: t.name,
      breadcrumb: (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <Icon name="layout-dashboard" size={11} /> {fam} · {shortId(t.id)} · v
          {t.version ?? 1}
        </span>
      ),
      tabs: [
        {
          id: "ozet",
          label: "Özet",
          children: (
            <div>
              <Row label="ID" value={<code>{t.id}</code>} />
              <Row label="Ad" value={t.name} />
              <Row label="Tip" value={t.template_type ?? "—"} />
              <Row label="Modül" value={t.module_scope ?? "global"} />
              <Row label="Versiyon" value={`v${t.version ?? 1}`} />
              <Row label="Owner" value={ownerPill(t.owner_scope)} />
              <Row label="Durum" value={statusPill(status)} />
              <Row
                label="Style link"
                value={String(t.style_link_count ?? 0)}
              />
              <Row
                label="Primary link"
                value={t.primary_link_role ?? "—"}
              />
              <Row label="Eklenme" value={timeAgo(t.created_at) + " önce"} />
              <Row label="Güncelleme" value={timeAgo(t.updated_at) + " önce"} />
              {t.description && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Açıklama
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {t.description}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "kullanim",
          label: "Kullanım",
          children: (
            <div>
              <Row label="İş (7g)" value={String(uses)} />
              <Row
                label="Style link"
                value={String(t.style_link_count ?? 0)}
              />
              <Row
                label="Primary link"
                value={t.primary_link_role ?? "—"}
              />
              <Row label="Versiyon" value={`v${t.version ?? 1}`} />
              {uses === 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    background: "var(--bg-inset)",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Son 7 gün içinde bu şablonla başlatılmış iş yok.
                </div>
              )}
            </div>
          ),
        },
        {
          id: "yapi",
          label: "Yapı",
          children: (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  style_profile_json
                </div>
                <pre
                  style={{
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    overflow: "auto",
                    margin: 0,
                    maxHeight: 200,
                  }}
                >
                  {prettyJson(t.style_profile_json)}
                </pre>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  content_rules_json
                </div>
                <pre
                  style={{
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    overflow: "auto",
                    margin: 0,
                    maxHeight: 200,
                  }}
                >
                  {prettyJson(t.content_rules_json)}
                </pre>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  publish_profile_json
                </div>
                <pre
                  style={{
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    overflow: "auto",
                    margin: 0,
                    maxHeight: 200,
                  }}
                >
                  {prettyJson(t.publish_profile_json)}
                </pre>
              </div>
            </div>
          ),
        },
      ],
      actions: [
        {
          label: "Kopyala ID",
          variant: "ghost",
          onClick: () => {
            navigator.clipboard?.writeText(t.id);
          },
        },
      ],
    };
  }

  const inspector = (
    <AuroraInspector title="Şablonlar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(counts.total)} />
        <AuroraInspectorRow label="aktif" value={String(counts.active)} />
        <AuroraInspectorRow label="taslak" value={String(counts.draft)} />
        <AuroraInspectorRow label="arşiv" value={String(counts.archived)} />
        <AuroraInspectorRow
          label="version lock"
          value={String(counts.versionLocked)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Sahiplik">
        <AuroraInspectorRow label="system" value={String(counts.ownerSystem)} />
        <AuroraInspectorRow label="admin" value={String(counts.ownerAdmin)} />
        <AuroraInspectorRow label="user" value={String(counts.ownerUser)} />
      </AuroraInspectorSection>

      {familyDistribution.length > 0 && (
        <AuroraInspectorSection title="Family dağılımı">
          {familyDistribution.slice(0, 6).map(([fam, n]) => (
            <AuroraInspectorRow key={fam} label={fam} value={String(n)} />
          ))}
        </AuroraInspectorSection>
      )}

      {topUsed && (
        <AuroraInspectorSection title="En çok kullanılan (7g)">
          <AuroraInspectorRow label="şablon" value={topUsed.name} />
          <AuroraInspectorRow label="iş sayısı" value={String(topUsed.uses)} />
        </AuroraInspectorSection>
      )}

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
            <h1>
              <Icon name="layout-dashboard" size={14} /> Şablonlar
            </h1>
            <div className="sub">
              {list.length} şablon · içerik / stil / yayın şablonları
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                background: "var(--bg-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
              }}
            >
              <Icon name="search" size={11} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara…"
                aria-label="Şablon ara"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  width: 140,
                }}
              />
            </div>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/templates/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni şablon
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
            Henüz şablon yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/templates/new")}
            >
              İlk şablonu oluştur →
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && filtered.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            "{search}" için sonuç bulunamadı.
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={
                        selected.size === filtered.length && filtered.length > 0
                      }
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Family</th>
                  <th>Owner</th>
                  <th style={{ textAlign: "right" }}>v</th>
                  <th style={{ textAlign: "right" }}>İş (7g)</th>
                  <th>Durum</th>
                  <th>Güncellendi</th>
                  <th style={{ width: 24 }} aria-label="aksiyon" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const status = deriveStatus(t.status);
                  const statusTone = STATUS_TONE[status];
                  const ownerKey = (t.owner_scope ?? "").toLowerCase();
                  const ownerTone = OWNER_TONE[ownerKey] ?? {
                    bg: "var(--bg-inset)",
                    fg: "var(--text-muted)",
                  };
                  const isSel = selected.has(t.id);
                  const uses = usageById.get(t.id) ?? 0;
                  const fam = family(t);
                  return (
                    <tr
                      key={t.id}
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
                          onChange={() => toggleRow(t.id)}
                          aria-label={`${t.name} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(t.id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {fam}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: ownerTone.bg,
                            color: ownerTone.fg,
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            textTransform: "lowercase",
                          }}
                        >
                          {t.owner_scope ?? "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color:
                            (t.version ?? 0) > 1
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                        }}
                      >
                        v{t.version ?? 1}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color: uses > 0
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {uses}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: statusTone.color,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: statusTone.color,
                              boxShadow: `0 0 5px ${statusTone.color}`,
                            }}
                          />
                          {statusTone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(t.updated_at)} önce
                      </td>
                      <td
                        style={{ color: "var(--text-muted)", textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setDrawerIdx(idx)}
                          aria-label={`${t.name} detayını aç`}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 2,
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          <Icon name="chevron-right" size={12} />
                        </button>
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
