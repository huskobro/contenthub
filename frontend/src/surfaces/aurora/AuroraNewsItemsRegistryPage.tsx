/**
 * AuroraNewsItemsRegistryPage — Aurora Dusk Cockpit / Haber Öğeleri (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/news-items-registry.html`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık + "Yenile" / "Yeni haber" aksiyonları
 *   - Lokal arama kutusu (başlık / kaynak / id üzerinde filtreler)
 *   - reg-tbl: Checkbox / ID / Başlık / Kaynak / Yayın tarihi / Trust / Durum /
 *     Son güncellendi sütunları
 *   - Inspector: toplam haber, kullanılmamış, kullanılmış, son 24 saat eklenen;
 *     trust dağılımı (low/medium/high)
 *
 * Veri kaynağı:
 *   - useNewsItemsList() — gerçek NewsItemResponse[]
 *   - useSourcesList()   — trust_level eşlemesi için (haber öğesi response'unda
 *                          yer almıyor; source_id üzerinden join edilir)
 *
 * Mutation:
 *   - news_itemsApi'da bulkDelete bulunmuyor; product priority'sine göre toplu
 *     silme bu sürümde devre dışı (CLAUDE.md: "Do not add out-of-scope features").
 *
 * Surface override sistemi tarafından `admin.news-items.registry` slot'una
 * kayıtlıdır; legacy NewsItemsRegistryPage trampolini bu bileşeni resolve
 * edildiğinde render eder.
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { useSourcesList } from "../../hooks/useSourcesList";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import type { SourceResponse } from "../../api/sourcesApi";
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

type TrustLevel = "low" | "medium" | "high" | "unknown";

const TRUST_TONE: Record<TrustLevel, { color: string; label: string }> = {
  high: { color: "var(--state-success-fg)", label: "high" },
  medium: { color: "var(--state-warning-fg)", label: "medium" },
  low: { color: "var(--state-danger-fg)", label: "low" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

type UsageState = "used" | "available" | "duplicate" | "other";

const USAGE_TONE: Record<UsageState, { color: string; label: string }> = {
  used: { color: "var(--state-info-fg)", label: "kullanıldı" },
  available: { color: "var(--state-success-fg)", label: "kullanılabilir" },
  duplicate: { color: "var(--text-muted)", label: "duplicate" },
  other: { color: "var(--text-muted)", label: "—" },
};

function shortId(id: string): string {
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

function normalizeTrust(raw: string | null | undefined): TrustLevel {
  const v = (raw ?? "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "unknown";
}

function deriveUsage(item: NewsItemResponse): UsageState {
  const status = (item.status ?? "").toLowerCase();
  if (status === "used") return "used";
  if (status === "available" || status === "fetched" || status === "new")
    return "available";
  if (status === "duplicate" || status === "deduped") return "duplicate";
  if ((item.usage_count ?? 0) > 0 || item.has_published_used_news_link)
    return "used";
  return "other";
}

function within24h(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

export function AuroraNewsItemsRegistryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: items,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useNewsItemsList();
  const { data: sources } = useSourcesList();

  const list: NewsItemResponse[] = items ?? [];

  // source_id → trust_level eşlemesi (NewsItemResponse trust içermiyor).
  const trustBySourceId = useMemo(() => {
    const m = new Map<string, TrustLevel>();
    for (const s of (sources ?? []) as SourceResponse[]) {
      m.set(s.id, normalizeTrust(s.trust_level));
    }
    return m;
  }, [sources]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  // QuickLook + DetailDrawer state — peek modeli: tek tıkla quick look açılır,
  // genişletmek için "Detayı aç" tuşu drawer'a geçirir; drawer ←/→ ile aynı
  // listede gezinir.
  const [quickIdx, setQuickIdx] = useState<number | null>(null);
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => {
      const title = (it.title ?? "").toLowerCase();
      const source = (it.source_name ?? "").toLowerCase();
      const id = (it.id ?? "").toLowerCase();
      return title.includes(q) || source.includes(q) || id.includes(q);
    });
  }, [list, query]);

  const counts = useMemo(() => {
    const c = {
      total: list.length,
      used: 0,
      available: 0,
      duplicate: 0,
      other: 0,
      last24h: 0,
      trustLow: 0,
      trustMedium: 0,
      trustHigh: 0,
      trustUnknown: 0,
    };
    for (const it of list) {
      c[deriveUsage(it)] += 1;
      if (within24h(it.created_at)) c.last24h += 1;
      const t = it.source_id
        ? trustBySourceId.get(it.source_id) ?? "unknown"
        : "unknown";
      if (t === "low") c.trustLow += 1;
      else if (t === "medium") c.trustMedium += 1;
      else if (t === "high") c.trustHigh += 1;
      else c.trustUnknown += 1;
    }
    return c;
  }, [list, trustBySourceId]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["news-items"] });
    queryClient.invalidateQueries({ queryKey: ["sources"] });
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
      if (prev.size === filtered.length && filtered.length > 0) return new Set();
      return new Set(filtered.map((s) => s.id));
    });
  }

  // QuickLook item üretici — filtered listesi index'inden NewsItemResponse okur.
  const buildQuickLookItem = (idx: number): AuroraQuickLookItem | null => {
    const it = filtered[idx];
    if (!it) return null;
    const trust = it.source_id
      ? trustBySourceId.get(it.source_id) ?? "unknown"
      : "unknown";
    const usage = deriveUsage(it);
    return {
      title: it.title || "(başlıksız)",
      subtitle: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="globe" size={11} />
          {it.source_name || "Bilinmeyen kaynak"}
          <span style={{ color: "var(--text-muted)" }}>·</span>
          {shortId(it.id)}
        </span>
      ),
      preview: (
        <div style={{ padding: 18, fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {it.summary ? (
            <p style={{ marginTop: 0 }}>{it.summary}</p>
          ) : (
            <p style={{ margin: 0, color: "var(--text-muted)", fontStyle: "italic" }}>
              Bu haberin özeti henüz yok.
            </p>
          )}
          {it.url && (
            <p style={{ marginBottom: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}>
              <a
                href={it.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--accent-primary-hover)", wordBreak: "break-all" }}
              >
                {it.url}
              </a>
            </p>
          )}
        </div>
      ),
      meta: [
        { k: "Yayın", v: it.published_at ? `${timeAgo(it.published_at)} önce` : "—" },
        { k: "Trust", v: TRUST_TONE[trust].label },
        { k: "Durum", v: USAGE_TONE[usage].label },
        { k: "Dil", v: it.language || "—" },
        { k: "Kategori", v: it.category || "—" },
        { k: "Kullanım", v: String(it.usage_count ?? 0) },
      ],
      actions: [
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
          onClick: () => navigate(`/admin/news-items/${it.id}`),
        },
      ],
    };
  };

  // DetailDrawer item üretici — 4 sekme: Özet, Kullanım, Ham veri, Eylemler.
  const buildDrawerItem = (idx: number): AuroraDrawerItem | null => {
    const it = filtered[idx];
    if (!it) return null;
    const trust = it.source_id
      ? trustBySourceId.get(it.source_id) ?? "unknown"
      : "unknown";
    const usage = deriveUsage(it);
    const trustTone = TRUST_TONE[trust];
    const usageTone = USAGE_TONE[usage];
    const rawJson = it.raw_payload_json;
    let prettyJson: string | null = null;
    if (rawJson) {
      try {
        prettyJson = JSON.stringify(JSON.parse(rawJson), null, 2);
      } catch {
        prettyJson = rawJson;
      }
    }
    const Row = ({ k, v }: { k: string; v: ReactNode }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 12,
          padding: "6px 0",
          borderBottom: "1px solid var(--border-default)",
          fontSize: 12,
        }}
      >
        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {k}
        </span>
        <span style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>{v}</span>
      </div>
    );
    return {
      breadcrumb: (
        <span>
          Haber öğeleri ·{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>{shortId(it.id)}</span>
        </span>
      ),
      title: it.title || "(başlıksız)",
      tabs: [
        {
          id: "overview",
          label: "Özet",
          children: (
            <div style={{ padding: "12px 4px" }}>
              <Row k="ID" v={<span style={{ fontFamily: "var(--font-mono)" }}>{it.id}</span>} />
              <Row k="Kaynak" v={it.source_name || "—"} />
              <Row
                k="URL"
                v={
                  it.url ? (
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: "var(--accent-primary-hover)" }}
                    >
                      {it.url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k="Yayın" v={it.published_at ? new Date(it.published_at).toLocaleString("tr-TR") : "—"} />
              <Row k="Eklenme" v={new Date(it.created_at).toLocaleString("tr-TR")} />
              <Row k="Güncelleme" v={new Date(it.updated_at).toLocaleString("tr-TR")} />
              <Row k="Dil" v={it.language || "—"} />
              <Row k="Kategori" v={it.category || "—"} />
              <Row
                k="Trust"
                v={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: trustTone.color,
                        boxShadow: `0 0 5px ${trustTone.color}`,
                      }}
                    />
                    {trustTone.label}
                  </span>
                }
              />
              <Row
                k="Durum"
                v={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: usageTone.color,
                        boxShadow: `0 0 5px ${usageTone.color}`,
                      }}
                    />
                    {usageTone.label}
                  </span>
                }
              />
              {it.summary && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    Özet
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    {it.summary}
                  </p>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "usage",
          label: "Kullanım",
          children: (
            <div style={{ padding: "12px 4px" }}>
              <Row k="Toplam" v={String(it.usage_count ?? 0)} />
              <Row k="Son tip" v={it.last_usage_type || "—"} />
              <Row k="Son modül" v={it.last_target_module || "—"} />
              <Row
                k="Yayın bağı"
                v={it.has_published_used_news_link ? "Evet" : "Hayır"}
              />
              <Row k="Dedupe key" v={<span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{it.dedupe_key || "—"}</span>} />
              {(it.usage_count ?? 0) === 0 && (
                <p style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
                  Bu haber henüz hiçbir içerikte kullanılmamış.
                </p>
              )}
            </div>
          ),
        },
        {
          id: "raw",
          label: "Ham veri",
          children: (
            <div style={{ padding: "12px 4px" }}>
              {prettyJson ? (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    overflow: "auto",
                    maxHeight: "60vh",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {prettyJson}
                </pre>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
                  Bu kayıt için saklanan ham yanıt yok.
                </p>
              )}
            </div>
          ),
        },
      ],
      actions: [
        {
          label: "Sayfaya git",
          variant: "primary",
          onClick: () => navigate(`/admin/news-items/${it.id}`),
        },
        { spacer: true },
        {
          label: "Kopyala (ID)",
          variant: "ghost",
          onClick: () => {
            navigator.clipboard?.writeText(it.id).catch(() => {
              /* clipboard erişimi yoksa sessizce geç — UX bloklanmaz */
            });
          },
        },
      ],
    };
  };

  const quickLookItem = quickIdx !== null ? buildQuickLookItem(quickIdx) : null;
  const drawerItem = drawerIdx !== null ? buildDrawerItem(drawerIdx) : null;

  const inspector = (
    <AuroraInspector title="Haber öğeleri">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(counts.total)} />
        <AuroraInspectorRow
          label="kullanılmamış"
          value={String(counts.available + counts.other + counts.duplicate)}
        />
        <AuroraInspectorRow label="kullanıldı" value={String(counts.used)} />
        <AuroraInspectorRow
          label="son 24 saat"
          value={String(counts.last24h)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Güven seviyesi">
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: TRUST_TONE.high.color,
                  boxShadow: `0 0 6px ${TRUST_TONE.high.color}`,
                }}
              />
              high
            </span>
          }
          value={String(counts.trustHigh)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: TRUST_TONE.medium.color,
                  boxShadow: `0 0 6px ${TRUST_TONE.medium.color}`,
                }}
              />
              medium
            </span>
          }
          value={String(counts.trustMedium)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: TRUST_TONE.low.color,
                  boxShadow: `0 0 6px ${TRUST_TONE.low.color}`,
                }}
              />
              low
            </span>
          }
          value={String(counts.trustLow)}
        />
        {counts.trustUnknown > 0 && (
          <AuroraInspectorRow
            label="bilinmiyor"
            value={String(counts.trustUnknown)}
          />
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
            <span>toplu silme mevcut sürümde kapalı</span>
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
            <h1>Haber öğeleri</h1>
            <div className="sub">
              {list.length} öğe · kaynaklardan çekilen haberler
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
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/news-items/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni haber
            </AuroraButton>
          </div>
        </div>

        <div
          className="card card-pad"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 10,
          }}
        >
          <Icon name="search" size={13} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Başlık, kaynak veya ID ara…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            aria-label="Haber ara"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            >
              temizle
            </button>
          )}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <Icon name="list-checks" size={11} /> {filtered.length}/{list.length}
          </span>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Haber akışı yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                color: "var(--state-danger-fg)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="alert-circle" size={12} />
              Haberler yüklenemedi:{" "}
              {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </span>
            <AuroraButton size="sm" onClick={() => refetch()}>
              Tekrar dene
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Henüz haber yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/news-items/new")}
            >
              İlk haberi ekle →
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && filtered.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}
          >
            Aramayla eşleşen haber yok.
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
                  <th>Başlık</th>
                  <th>Kaynak</th>
                  <th>Yayın</th>
                  <th>Trust</th>
                  <th>Durum</th>
                  <th>Son güncelleme</th>
                  <th style={{ width: 30 }} aria-label="aç" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((it, idx) => {
                  const usage = deriveUsage(it);
                  const usageTone = USAGE_TONE[usage];
                  const trust = it.source_id
                    ? trustBySourceId.get(it.source_id) ?? "unknown"
                    : "unknown";
                  const trustTone = TRUST_TONE[trust];
                  const isSel = selected.has(it.id);
                  return (
                    <tr
                      key={it.id}
                      onDoubleClick={() => navigate(`/admin/news-items/${it.id}`)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(it.id)}
                          aria-label={`${it.title} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(it.id)}
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
                          onClick={() => setQuickIdx(idx)}
                          title={`${it.title || "(başlıksız)"} — hızlı bak`}
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
                          {it.title || "(başlıksız)"}
                        </button>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Icon name="globe" size={11} />
                          {it.source_name || "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {it.published_at
                          ? `${timeAgo(it.published_at)} önce`
                          : "—"}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: trustTone.color,
                              boxShadow: `0 0 5px ${trustTone.color}`,
                            }}
                          />
                          {trustTone.label}
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
                              background: usageTone.color,
                              boxShadow: `0 0 6px ${usageTone.color}`,
                            }}
                          />
                          {usageTone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(it.updated_at)} önce
                      </td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        style={{ textAlign: "right" }}
                      >
                        <button
                          type="button"
                          onClick={() => setDrawerIdx(idx)}
                          aria-label="Detay panelini aç"
                          title="Detay panelini aç (drawer)"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            padding: 2,
                          }}
                        >
                          <Icon name="chevron-right" size={13} />
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
      <AuroraQuickLook
        item={quickLookItem}
        onClose={() => setQuickIdx(null)}
        onPrev={
          quickIdx !== null && quickIdx > 0
            ? () => setQuickIdx((i) => (i !== null ? i - 1 : null))
            : undefined
        }
        onNext={
          quickIdx !== null && quickIdx < filtered.length - 1
            ? () => setQuickIdx((i) => (i !== null ? i + 1 : null))
            : undefined
        }
        hasPrev={quickIdx !== null && quickIdx > 0}
        hasNext={quickIdx !== null && quickIdx < filtered.length - 1}
      />
      <AuroraDetailDrawer
        item={drawerItem}
        onClose={() => setDrawerIdx(null)}
      />
    </div>
  );
}
