/**
 * AuroraSourcesRegistryPage — Aurora Dusk Cockpit / Kaynak Kayıtları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/sources-registry.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Tümünü tara" / "Kaynak ekle" aksiyonları)
 *   - reg-tbl ID/Ad/URL/Tip/Sağlık/Son tarama/Makale/Toplam tarama kolonları
 *   - Sağlık health-dot + label, mono URL/ID/sayılar
 *   - Inspector: Toplam / sağlıklı / bozuk / çevrimdışı KPI'leri
 *
 * Veri kaynağı: useSourcesList() — gerçek SourceResponse[].
 * Mutations: bulkDeleteSources (toplu seçim aksiyonu için).
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.sources.registry` slot'una kayıtlı.
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSourcesList } from "../../hooks/useSourcesList";
import {
  bulkDeleteSources,
  triggerSourceScan,
  type SourceResponse,
} from "../../api/sourcesApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraQuickLook,
  AuroraDetailDrawer,
  type AuroraQuickLookItem,
  type AuroraDrawerItem,
} from "./primitives";
import { Icon } from "./icons";

type HealthLevel = "healthy" | "degraded" | "down" | "unknown";

const HEALTH_TONE: Record<HealthLevel, { color: string; label: string }> = {
  healthy: { color: "var(--state-success-fg)", label: "sağlıklı" },
  degraded: { color: "var(--state-warning-fg)", label: "bozuk" },
  down: { color: "var(--state-danger-fg)", label: "çevrimdışı" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

function deriveHealth(s: SourceResponse): HealthLevel {
  if (s.status && s.status.toLowerCase() === "disabled") return "down";
  const fails = s.consecutive_failure_count ?? 0;
  const lastStatus = (s.last_scan_status ?? "").toLowerCase();
  if (fails >= 3 || lastStatus === "failed" || lastStatus === "error") return "down";
  if (fails > 0 || lastStatus === "partial" || lastStatus === "stale") return "degraded";
  if (lastStatus === "success" || lastStatus === "completed") return "healthy";
  if (s.scan_count && s.scan_count > 0) return "healthy";
  return "unknown";
}

function shortHost(s: SourceResponse): string {
  const url = s.feed_url ?? s.base_url ?? s.api_endpoint ?? "";
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.host + (u.pathname && u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
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

function typeChip(t: string): string {
  const lower = (t || "").toLowerCase();
  if (lower === "rss") return "RSS";
  if (lower === "api") return "API";
  if (lower === "scrape") return "Scrape";
  if (lower === "manual") return "Manuel";
  return t || "—";
}

export function AuroraSourcesRegistryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: sources, isLoading, isError, error } = useSourcesList();
  const list = sources ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickIdx, setQuickIdx] = useState<number | null>(null);
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
    for (const s of list) c[deriveHealth(s)] += 1;
    return c;
  }, [list]);

  const { mutate: scanAll, isPending: scanningAll } = useMutation({
    mutationFn: async () => {
      const targets = list.filter((s) => deriveHealth(s) !== "down");
      const results = await Promise.allSettled(
        targets.map((s) => triggerSourceScan(s.id)),
      );
      // Pass-6: yeni/dedupe sayilarini agrega et — toast'ta gercek sayilari soyle.
      let ok = 0;
      let totalNew = 0;
      let totalFetched = 0;
      let totalSkipped = 0;
      let firstError: string | null = null;
      for (const r of results) {
        if (r.status === "fulfilled") {
          ok += 1;
          totalNew += r.value.new_count ?? 0;
          totalFetched += r.value.fetched_count ?? 0;
          totalSkipped += r.value.skipped_dedupe ?? 0;
          if (!firstError && r.value.error_summary) firstError = r.value.error_summary;
        }
      }
      return { ok, total: targets.length, totalNew, totalFetched, totalSkipped, firstError };
    },
    onSuccess: ({ ok, total, totalNew, totalFetched, totalSkipped, firstError }) => {
      // Pass-6: durust feedback — basarili kaynak / yeni haber / fetched / dedupe.
      if (firstError) {
        toast.error(
          `${ok}/${total} kaynak tarandı (uyarı: ${firstError.slice(0, 60)})`,
        );
      } else {
        toast.success(
          `${ok}/${total} kaynak: ${totalNew} yeni · ${totalFetched} fetch · ${totalSkipped} dedupe`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
    },
    onError: () => toast.error("Toplu tarama başlatılamadı"),
  });

  const { mutate: bulkDelete, isPending: deleting } = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteSources(ids),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} kaynak silindi`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
    },
    onError: () => toast.error("Silme işlemi başarısız"),
  });

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
      return new Set(list.map((s) => s.id));
    });
  }

  const buildQuickLook = (idx: number): AuroraQuickLookItem | null => {
    const s = list[idx];
    if (!s) return null;
    const health = deriveHealth(s);
    const tone = HEALTH_TONE[health];
    return {
      title: s.name,
      subtitle: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="globe" size={11} />
          <span style={{ fontFamily: "var(--font-mono)" }}>{shortHost(s)}</span>
          <span style={{ color: "var(--text-muted)" }}>·</span>
          {shortId(s.id)}
        </span>
      ),
      preview: (
        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: tone.color,
                boxShadow: `0 0 6px ${tone.color}`,
              }}
            />
            Sağlık: {tone.label}
          </div>
          {s.notes && (
            <p
              style={{
                marginTop: 14,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--text-secondary)",
              }}
            >
              {s.notes}
            </p>
          )}
          {s.last_scan_error && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "var(--bg-inset)",
                border: "1px solid var(--state-danger-fg)",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--state-danger-fg)",
              }}
            >
              Son tarama hatası: {s.last_scan_error}
            </div>
          )}
        </div>
      ),
      meta: [
        { k: "Tip", v: typeChip(s.source_type) },
        { k: "Trust", v: s.trust_level || "—" },
        { k: "Tarama modu", v: s.scan_mode || "—" },
        { k: "Son tarama", v: timeAgo(s.last_scan_finished_at) + " önce" },
        { k: "Bağlı haber", v: String(s.linked_news_count ?? 0) },
        { k: "Toplam tarama", v: String(s.scan_count ?? 0) },
      ],
      actions: [
        {
          label: "Şimdi tara",
          variant: "secondary",
          onClick: () => {
            triggerSourceScan(s.id)
              .then((res) => {
                // Pass-6 honest feedback: yeni / fetch / dedupe.
                if (res.error_summary) {
                  toast.error(
                    `${s.name}: tarama hata ile bitti (${res.error_summary.slice(0, 60)})`,
                  );
                } else {
                  toast.success(
                    `${s.name}: ${res.new_count} yeni · ${res.fetched_count} fetch · ${res.skipped_dedupe} dedupe`,
                  );
                }
                queryClient.invalidateQueries({ queryKey: ["sources"] });
                queryClient.invalidateQueries({ queryKey: ["source-scans"] });
                queryClient.invalidateQueries({ queryKey: ["news-items"] });
              })
              .catch(() => toast.error("Tarama başlatılamadı"));
          },
        },
        {
          label: "Tüm detayı aç",
          variant: "secondary",
          onClick: () => {
            setQuickIdx(null);
            setDrawerIdx(idx);
          },
        },
        {
          label: "Sayfaya git",
          variant: "primary",
          onClick: () => navigate(`/admin/sources/${s.id}`),
        },
      ],
    };
  };

  const buildDrawer = (idx: number): AuroraDrawerItem | null => {
    const s = list[idx];
    if (!s) return null;
    const health = deriveHealth(s);
    const tone = HEALTH_TONE[health];
    const Row = ({ k, v }: { k: string; v: ReactNode }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          gap: 12,
          padding: "6px 0",
          borderBottom: "1px solid var(--border-default)",
          fontSize: 12,
        }}
      >
        <span
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {k}
        </span>
        <span style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>{v}</span>
      </div>
    );
    return {
      breadcrumb: <span>Kaynaklar · {shortId(s.id)}</span>,
      title: s.name,
      tabs: [
        {
          id: "overview",
          label: "Özet",
          children: (
            <div style={{ padding: "12px 4px" }}>
              <Row k="ID" v={<span style={{ fontFamily: "var(--font-mono)" }}>{s.id}</span>} />
              <Row k="Tip" v={typeChip(s.source_type)} />
              <Row k="Durum" v={s.status} />
              <Row
                k="Sağlık"
                v={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: tone.color,
                        boxShadow: `0 0 5px ${tone.color}`,
                      }}
                    />
                    {tone.label}
                  </span>
                }
              />
              <Row k="Trust" v={s.trust_level || "—"} />
              <Row k="Tarama modu" v={s.scan_mode || "—"} />
              <Row k="Dil" v={s.language || "—"} />
              <Row k="Kategori" v={s.category || "—"} />
              <Row
                k="Feed URL"
                v={
                  s.feed_url ? (
                    <a
                      href={s.feed_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: "var(--accent-primary-hover)" }}
                    >
                      {s.feed_url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                k="Base URL"
                v={
                  s.base_url ? (
                    <a
                      href={s.base_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: "var(--accent-primary-hover)" }}
                    >
                      {s.base_url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k="API endpoint" v={s.api_endpoint || "—"} />
              <Row k="Eklenme" v={new Date(s.created_at).toLocaleString("tr-TR")} />
              <Row k="Güncelleme" v={new Date(s.updated_at).toLocaleString("tr-TR")} />
            </div>
          ),
        },
        {
          id: "scan",
          label: "Tarama",
          children: (
            <div style={{ padding: "12px 4px" }}>
              <Row k="Toplam tarama" v={String(s.scan_count ?? 0)} />
              <Row k="Son durum" v={s.last_scan_status || "—"} />
              <Row
                k="Son tarama"
                v={
                  s.last_scan_finished_at
                    ? new Date(s.last_scan_finished_at).toLocaleString("tr-TR")
                    : "—"
                }
              />
              <Row k="Ardışık hata" v={String(s.consecutive_failure_count ?? 0)} />
              <Row k="Bağlı haber" v={String(s.linked_news_count ?? 0)} />
              <Row k="Üretilen kullanılmış" v={String(s.used_news_count_from_source ?? 0)} />
              {s.last_scan_error && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    background: "var(--bg-inset)",
                    border: "1px solid var(--state-danger-fg)",
                    borderRadius: 6,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--state-danger-fg)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {s.last_scan_error}
                </div>
              )}
            </div>
          ),
        },
        {
          id: "notes",
          label: "Notlar",
          children: (
            <div style={{ padding: "12px 4px" }}>
              {s.notes ? (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                  {s.notes}
                </p>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
                  Bu kaynak için notlar girilmemiş.
                </p>
              )}
            </div>
          ),
        },
      ],
      actions: [
        {
          label: "Şimdi tara",
          variant: "secondary",
          onClick: () => {
            triggerSourceScan(s.id)
              .then((res) => {
                // Pass-6 honest feedback: yeni / fetch / dedupe.
                if (res.error_summary) {
                  toast.error(
                    `${s.name}: tarama hata ile bitti (${res.error_summary.slice(0, 60)})`,
                  );
                } else {
                  toast.success(
                    `${s.name}: ${res.new_count} yeni · ${res.fetched_count} fetch · ${res.skipped_dedupe} dedupe`,
                  );
                }
                queryClient.invalidateQueries({ queryKey: ["sources"] });
                queryClient.invalidateQueries({ queryKey: ["source-scans"] });
                queryClient.invalidateQueries({ queryKey: ["news-items"] });
              })
              .catch(() => toast.error("Tarama başlatılamadı"));
          },
        },
        {
          label: "Sayfaya git",
          variant: "primary",
          onClick: () => navigate(`/admin/sources/${s.id}`),
        },
        { spacer: true },
        {
          label: "Kopyala (ID)",
          variant: "ghost",
          onClick: () => {
            navigator.clipboard?.writeText(s.id).catch(() => {
              /* sessizce yut */
            });
          },
        },
      ],
    };
  };

  const quickLookItem = quickIdx !== null ? buildQuickLook(quickIdx) : null;
  const drawerItem = drawerIdx !== null ? buildDrawer(drawerIdx) : null;

  const inspector = (
    <AuroraInspector title="Kaynaklar">
      <AuroraInspectorSection title="Sağlık">
        <AuroraInspectorRow label="toplam" value={String(list.length)} />
        <AuroraInspectorRow label="sağlıklı" value={String(counts.healthy)} />
        <AuroraInspectorRow label="bozuk" value={String(counts.degraded)} />
        <AuroraInspectorRow label="çevrimdışı" value={String(counts.down)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Bu hafta">
        <AuroraInspectorRow
          label="toplam tarama"
          value={String(list.reduce((acc, s) => acc + (s.scan_count ?? 0), 0))}
        />
        <AuroraInspectorRow
          label="bağlı haber"
          value={String(list.reduce((acc, s) => acc + (s.linked_news_count ?? 0), 0))}
        />
        <AuroraInspectorRow
          label="kullanılan haber"
          value={String(list.reduce((acc, s) => acc + (s.used_news_count_from_source ?? 0), 0))}
        />
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
          <div style={{ marginTop: 8 }}>
            <AuroraButton
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={() => bulkDelete(Array.from(selected))}
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
            <h1>Kaynaklar</h1>
            <div className="sub">
              {list.length} kaynak · RSS, API, Scrape
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => scanAll()}
              disabled={scanningAll || list.length === 0}
              iconLeft={<Icon name="refresh" size={11} />}
            >
              {scanningAll ? "Taranıyor…" : "Tümünü tara"}
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/sources/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Kaynak ekle
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
            Henüz kaynak yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/sources/new")}
            >
              İlk kaynağı ekle →
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
                  <th>Ad</th>
                  <th>URL</th>
                  <th>Tip</th>
                  <th>Sağlık</th>
                  <th>Son tarama</th>
                  <th style={{ textAlign: "right" }}>Bağlı</th>
                  <th style={{ textAlign: "right" }}>Toplam tarama</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, idx) => {
                  const health = deriveHealth(s);
                  const tone = HEALTH_TONE[health];
                  const isSel = selected.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      onDoubleClick={() => navigate(`/admin/sources/${s.id}`)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(s.id)}
                          aria-label={`${s.name} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(s.id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <button
                          type="button"
                          onClick={() => setQuickIdx(idx)}
                          title={`${s.name} — hızlı bak`}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {s.name}
                        </button>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {shortHost(s)}
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 10 }}>
                          {typeChip(s.source_type)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: tone.color,
                              boxShadow: `0 0 6px ${tone.color}`,
                            }}
                          />
                          {tone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(s.last_scan_finished_at)} önce
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {s.linked_news_count ?? 0}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          textAlign: "right",
                        }}
                      >
                        {s.scan_count ?? 0}
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
      <AuroraQuickLook
        item={quickLookItem}
        onClose={() => setQuickIdx(null)}
        onPrev={
          quickIdx !== null && quickIdx > 0
            ? () => setQuickIdx((i) => (i !== null ? i - 1 : null))
            : undefined
        }
        onNext={
          quickIdx !== null && quickIdx < list.length - 1
            ? () => setQuickIdx((i) => (i !== null ? i + 1 : null))
            : undefined
        }
        hasPrev={quickIdx !== null && quickIdx > 0}
        hasNext={quickIdx !== null && quickIdx < list.length - 1}
      />
      <AuroraDetailDrawer
        item={drawerItem}
        onClose={() => setDrawerIdx(null)}
      />
    </div>
  );
}
