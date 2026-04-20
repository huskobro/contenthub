/**
 * AuroraNewsBulletinRegistryPage — Aurora Dusk Cockpit / Haber Bültenleri (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/news-bulletin-registry.html`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık + "Haber öğeleri" / "Yeni bülten"
 *     aksiyonları (mockup'taki ikon dizilimi korunur)
 *   - reg-tbl: Checkbox / ID (mono) / Başlık / Oluşturuldu (rel) / Haber /
 *     Status chip / Template chip / Dil chip / Son güncelleme sütunları
 *   - Inspector KPI: toplam, status dağılımı (draft/in_progress/ready/
 *     published vb.), bu hafta üretilenler, ortalama haber sayısı
 *
 * Veri kaynağı:
 *   - useNewsBulletinsList()  — gerçek NewsBulletinResponse[]
 *   - useTemplatesList()      — template_id → template.name eşlemesi
 *
 * NOT (CLAUDE.md / "stay within scope"):
 *   - NewsBulletinResponse'ta `scheduled_at` ve `owner_user_id` alanları
 *     yok. "Scheduled" kolonu yerine `created_at` (oluşturuldu) gösterilir;
 *     owner chip yerine `language` chip'i konur. API genişlerse bu kolon
 *     ileride doğal olarak değişebilir.
 *   - Bu sürümde toplu silme/aksiyon yok (newsBulletinApi'da bulkDelete
 *     yok; out-of-scope feature eklenmez).
 *
 * Surface override sistemi tarafından `admin.news-bulletins.registry`
 * slot'una bağlanır (register.tsx); legacy NewsBulletinRegistryPage
 * trampolini bu bileşeni override sağlandığında render eder.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Status normalization (preserves raw value for unknown statuses)
// ---------------------------------------------------------------------------

type StatusTone = {
  color: string;
  bg: string;
  border: string;
  label: string;
};

const STATUS_TONE: Record<string, StatusTone> = {
  draft: {
    color: "var(--text-muted)",
    bg: "var(--state-neutral-bg)",
    border: "var(--state-neutral-border)",
    label: "draft",
  },
  in_progress: {
    color: "var(--state-info-fg)",
    bg: "var(--state-info-bg)",
    border: "var(--state-info-border)",
    label: "in_progress",
  },
  rendering: {
    color: "var(--state-info-fg)",
    bg: "var(--state-info-bg)",
    border: "var(--state-info-border)",
    label: "rendering",
  },
  ready: {
    color: "var(--state-warning-fg)",
    bg: "var(--state-warning-bg)",
    border: "var(--state-warning-border)",
    label: "ready",
  },
  scheduled: {
    color: "var(--state-warning-fg)",
    bg: "var(--state-warning-bg)",
    border: "var(--state-warning-border)",
    label: "scheduled",
  },
  published: {
    color: "var(--state-success-fg)",
    bg: "var(--state-success-bg)",
    border: "var(--state-success-border)",
    label: "published",
  },
  review_rejected: {
    color: "var(--state-danger-fg)",
    bg: "var(--state-danger-bg)",
    border: "var(--state-danger-border)",
    label: "rejected",
  },
  failed: {
    color: "var(--state-danger-fg)",
    bg: "var(--state-danger-bg)",
    border: "var(--state-danger-border)",
    label: "failed",
  },
};

function statusTone(raw: string | null | undefined): StatusTone {
  const v = (raw ?? "").toLowerCase();
  if (STATUS_TONE[v]) return STATUS_TONE[v];
  return {
    color: "var(--text-muted)",
    bg: "var(--state-neutral-bg)",
    border: "var(--state-neutral-border)",
    label: raw || "—",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
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

function within7d(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
}

function bulletinTitle(b: NewsBulletinResponse): string {
  return b.title?.trim() || b.topic?.trim() || "(başlıksız)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraNewsBulletinRegistryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: bulletins,
    isLoading,
    isError,
    error,
    isFetching,
  } = useNewsBulletinsList();
  const { data: templates } = useTemplatesList({ module_scope: "news_bulletin" });

  const list: NewsBulletinResponse[] = bulletins ?? [];

  // template_id → template.name eşlemesi (chip etiketi için)
  const templateNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of templates ?? []) {
      if (t?.id) m.set(t.id, t.name ?? t.id);
    }
    return m;
  }, [templates]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c = {
      total: list.length,
      draft: 0,
      in_progress: 0,
      ready: 0,
      published: 0,
      other: 0,
      thisWeek: 0,
      itemsTotal: 0,
      withItems: 0,
    };
    for (const b of list) {
      const s = (b.status ?? "").toLowerCase();
      if (s === "draft") c.draft += 1;
      else if (
        s === "in_progress" ||
        s === "rendering" ||
        s === "scheduled"
      )
        c.in_progress += 1;
      else if (s === "ready" || s === "review_pending") c.ready += 1;
      else if (s === "published") c.published += 1;
      else c.other += 1;

      if (within7d(b.created_at)) c.thisWeek += 1;

      const items = b.selected_news_count ?? 0;
      if (items > 0) {
        c.itemsTotal += items;
        c.withItems += 1;
      }
    }
    return c;
  }, [list]);

  const avgItems =
    counts.withItems > 0 ? (counts.itemsTotal / counts.withItems).toFixed(1) : "0";

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
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
      if (prev.size === list.length && list.length > 0) return new Set();
      return new Set(list.map((b) => b.id));
    });
  }

  const inspector = (
    <AuroraInspector title="Haber bültenleri">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(counts.total)} />
        <AuroraInspectorRow label="bu hafta" value={String(counts.thisWeek)} />
        <AuroraInspectorRow label="ort. haber" value={avgItems} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Durum dağılımı">
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.draft.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.draft.color}`,
                }}
              />
              draft
            </span>
          }
          value={String(counts.draft)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.in_progress.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.in_progress.color}`,
                }}
              />
              in_progress
            </span>
          }
          value={String(counts.in_progress)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.ready.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.ready.color}`,
                }}
              />
              ready
            </span>
          }
          value={String(counts.ready)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.published.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.published.color}`,
                }}
              />
              published
            </span>
          }
          value={String(counts.published)}
        />
        {counts.other > 0 && (
          <AuroraInspectorRow label="diğer" value={String(counts.other)} />
        )}
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <Icon name="alert-circle" size={11} />
            <span>toplu aksiyonlar bu sürümde kapalı</span>
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
            <h1>Haber bültenleri</h1>
            <div className="sub">
              {list.length} bülten · news_bulletin modülü
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isFetching}
              iconLeft={<Icon name="refresh" size={11} />}
            >
              {isFetching ? "Yenileniyor…" : "Yenile"}
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => navigate("/admin/news-items")}
              iconLeft={<Icon name="list" size={11} />}
            >
              Haber öğeleri
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/news-bulletins/wizard")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni bülten
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
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <Icon name="alert-circle" size={12} />
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Henüz bülten yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/news-bulletins/wizard")}
            >
              İlk bülteni oluştur →
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
                  <th>Başlık</th>
                  <th>Oluşturuldu</th>
                  <th style={{ textAlign: "right" }}>Haber</th>
                  <th>Durum</th>
                  <th>Şablon</th>
                  <th>Dil</th>
                  <th>Son güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => {
                  const tone = statusTone(b.status);
                  const isSel = selected.has(b.id);
                  const tplName = b.template_id
                    ? templateNameById.get(b.template_id) ?? "—"
                    : "—";
                  const lang = (b.language ?? "").toUpperCase() || "—";
                  return (
                    <tr
                      key={b.id}
                      onDoubleClick={() =>
                        navigate(`/admin/news-bulletins/${b.id}`)
                      }
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(b.id)}
                          aria-label={`${bulletinTitle(b)} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(b.id)}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          maxWidth: 360,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/news-bulletins/${b.id}`)
                          }
                          title={bulletinTitle(b)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {bulletinTitle(b)}
                        </button>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {b.created_at
                          ? `${timeAgo(b.created_at)} önce`
                          : "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {b.selected_news_count ?? 0}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: tone.color,
                            background: tone.bg,
                            borderColor: tone.border,
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
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            maxWidth: 140,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                          }}
                          title={tplName}
                        >
                          {tplName}
                        </span>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {lang}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(b.updated_at)} önce
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
    </div>
  );
}
