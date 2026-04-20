/**
 * AuroraUsedNewsRegistryPage — Aurora Dusk Cockpit / Kullanılan Haberler (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/used-news-registry.html`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık ("Dedupe kilitleri ve geçmiş")
 *   - reg-tbl: Checkbox / ID (mono) / Başlık / Kaynak / Tarih (relative) /
 *     Hedef job ID (mono link) / Reason (chip)
 *   - Inspector: toplam, son 24 saat, en çok kullanılan kaynak,
 *     en çok kullanan modül; modül dağılımı; seçim aksiyonu
 *
 * Veri kaynağı:
 *   - useUsedNewsList()   — gerçek UsedNewsResponse[]
 *   - useNewsItemsList()  — başlık + kaynak adı için news_item_id üzerinden join
 *
 * Reason chip eşlemesi (CLAUDE.md: prompt/strings settings'te yaşar; burada
 * UI tonu için tablo gösterimi):
 *   - usage_type === "published" → info chip "yayınlandı"
 *   - usage_type === "duplicate" → muted chip "duplicate"
 *   - usage_type === "draft"     → warn chip "taslak"
 *   - diğer                       → default chip
 *
 * Mutations: usedNewsApi şu an bulkDelete sunmuyor; toplu silme bu sürümde
 * devre dışı (CLAUDE.md: "Do not add out-of-scope features").
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.used-news.registry` slot'una kayıtlıdır.
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import type { UsedNewsResponse } from "../../api/usedNewsApi";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraDetailDrawer,
  type AuroraDrawerItem,
} from "./primitives";

type ReasonTone = "info" | "warn" | "muted" | "default";

const REASON_TONE: Record<string, { tone: ReasonTone; label: string }> = {
  published: { tone: "info", label: "yayınlandı" },
  duplicate: { tone: "muted", label: "duplicate" },
  draft: { tone: "warn", label: "taslak" },
  scheduled: { tone: "warn", label: "zamanlandı" },
  reused: { tone: "muted", label: "tekrar" },
};

function reasonChip(usageType: string | null | undefined): {
  tone: ReasonTone;
  label: string;
} {
  if (!usageType) return { tone: "default", label: "—" };
  const lower = usageType.toLowerCase();
  return (
    REASON_TONE[lower] ?? {
      tone: "default",
      label: usageType,
    }
  );
}

function reasonChipClass(tone: ReasonTone): string {
  if (tone === "info") return "chip info";
  if (tone === "warn") return "chip warn";
  if (tone === "muted") return "chip";
  return "chip";
}

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

function within24h(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function topKey(map: Map<string, number>): { key: string; count: number } | null {
  let best: { key: string; count: number } | null = null;
  map.forEach((count, key) => {
    if (!best || count > best.count) best = { key, count };
  });
  return best;
}

export function AuroraUsedNewsRegistryPage() {
  const navigate = useNavigate();

  const usedQuery = useUsedNewsList();
  const newsQuery = useNewsItemsList();

  const list: UsedNewsResponse[] = usedQuery.data ?? [];
  const newsItems: NewsItemResponse[] = newsQuery.data ?? [];

  const isLoading = usedQuery.isLoading;
  const isError = usedQuery.isError;
  const error = usedQuery.error;

  const newsById = useMemo(() => {
    const m = new Map<string, NewsItemResponse>();
    for (const n of newsItems) m.set(n.id, n);
    return m;
  }, [newsItems]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    const sourceCounts = new Map<string, number>();
    const moduleCounts = new Map<string, number>();
    let last24h = 0;
    for (const r of list) {
      if (within24h(r.created_at)) last24h += 1;
      const news = newsById.get(r.news_item_id);
      const sourceLabel = news?.source_name ?? news?.source_id ?? "bilinmeyen";
      sourceCounts.set(sourceLabel, (sourceCounts.get(sourceLabel) ?? 0) + 1);
      const moduleLabel = r.target_module || "—";
      moduleCounts.set(moduleLabel, (moduleCounts.get(moduleLabel) ?? 0) + 1);
    }
    return {
      total: list.length,
      last24h,
      topSource: topKey(sourceCounts),
      topModule: topKey(moduleCounts),
      moduleCounts,
    };
  }, [list, newsById]);

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
      return new Set(list.map((r) => r.id));
    });
  }

  const moduleEntries = useMemo(() => {
    return Array.from(stats.moduleCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    );
  }, [stats.moduleCounts]);

  function KvRow({ k, v }: { k: string; v: ReactNode }) {
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
          {k}
        </div>
        <div style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>
          {v}
        </div>
      </div>
    );
  }

  function buildDrawer(idx: number): AuroraDrawerItem | null {
    const r = list[idx];
    if (!r) return null;
    const news = newsById.get(r.news_item_id);
    const title = news?.title ?? "—";
    const sourceName =
      news?.source_name ??
      (news?.source_id ? shortId(news.source_id) : "—");
    const reason = reasonChip(r.usage_type);
    return {
      title,
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
          Kullanılan haber · {shortId(r.id)}
        </span>
      ),
      children: (
        <div>
          <KvRow k="Kayıt ID" v={<code>{r.id}</code>} />
          <KvRow k="Haber ID" v={<code>{r.news_item_id}</code>} />
          <KvRow k="Başlık" v={title} />
          <KvRow k="Kaynak" v={sourceName} />
          <KvRow
            k="Reason"
            v={
              <span
                className={reasonChipClass(reason.tone)}
                style={{ fontSize: 10 }}
              >
                {reason.label}
              </span>
            }
          />
          <KvRow k="Modül" v={r.target_module || "—"} />
          <KvRow
            k="Hedef job"
            v={
              r.target_entity_id ? (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerIdx(null);
                    navigate(`/admin/jobs/${r.target_entity_id}`);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent-primary-hover)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {r.target_entity_id}
                </button>
              ) : (
                "—"
              )
            }
          />
          <KvRow k="Kullanım tarihi" v={`${timeAgo(r.created_at)} önce`} />
          {r.usage_context && <KvRow k="Bağlam" v={r.usage_context} />}
          {r.notes && <KvRow k="Not" v={r.notes} />}
          {news?.url && (
            <KvRow
              k="Kaynak URL"
              v={
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--accent-primary-hover)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    wordBreak: "break-all",
                  }}
                >
                  {news.url}
                </a>
              }
            />
          )}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Kaynak haber payload'ı
            </div>
            {news?.raw_payload_json ? (
              <details>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  JSON'u göster
                </summary>
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    background: "var(--bg-inset)",
                    padding: 10,
                    borderRadius: 6,
                    maxHeight: 320,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(
                        JSON.parse(news.raw_payload_json),
                        null,
                        2,
                      );
                    } catch {
                      return news.raw_payload_json;
                    }
                  })()}
                </pre>
              </details>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Bu haber kaydında ham payload yok (haber kaynağı dummy/manuel
                eklenmiş olabilir).
              </div>
            )}
          </div>
        </div>
      ),
      actions: [
        {
          label: "Kopyala kayıt ID",
          variant: "ghost",
          onClick: () => {
            navigator.clipboard?.writeText(r.id);
          },
        },
      ],
    };
  }

  const inspector = (
    <AuroraInspector title="Kullanılan haberler">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="toplam" value={String(stats.total)} />
        <AuroraInspectorRow label="son 24s" value={String(stats.last24h)} />
        <AuroraInspectorRow
          label="en çok kaynak"
          value={
            stats.topSource
              ? `${stats.topSource.key} · ${stats.topSource.count}`
              : "—"
          }
        />
        <AuroraInspectorRow
          label="en çok modül"
          value={
            stats.topModule
              ? `${stats.topModule.key} · ${stats.topModule.count}`
              : "—"
          }
        />
      </AuroraInspectorSection>
      {moduleEntries.length > 0 && (
        <AuroraInspectorSection title="Modül dağılımı">
          {moduleEntries.slice(0, 6).map(([mod, count]) => (
            <AuroraInspectorRow key={mod} label={mod} value={String(count)} />
          ))}
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
            <h1>Kullanılan haberler</h1>
            <div className="sub">
              Dedupe kilitleri ve geçmiş · {list.length} kayıt
            </div>
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
            Henüz kullanılmış haber kaydı yok.
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
                  <th>Başlık</th>
                  <th>Kaynak</th>
                  <th>Kullanım tarihi</th>
                  <th>Hedef job</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, idx) => {
                  const isSel = selected.has(r.id);
                  const news = newsById.get(r.news_item_id);
                  const title = news?.title ?? "—";
                  const sourceLabel =
                    news?.source_name ??
                    (news?.source_id ? shortId(news.source_id) : "—");
                  const reason = reasonChip(r.usage_type);
                  return (
                    <tr
                      key={r.id}
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
                          onChange={() => toggleRow(r.id)}
                          aria-label={`${shortId(r.id)} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(r.id)}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={title}
                      >
                        {title}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {sourceLabel}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(r.created_at)} önce
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {r.target_entity_id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/jobs/${r.target_entity_id}`);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--accent-primary-hover)",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            {shortId(r.target_entity_id)}
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={reasonChipClass(reason.tone)}
                          style={{ fontSize: 10 }}
                        >
                          {reason.label}
                        </span>
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
